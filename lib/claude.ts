// lib/claude.ts — Claude (claude-opus-4-8) parsers, adapted to the shared
// contract in lib/types.ts. OWNED BY SHAURYA. Server-side only (API key never
// shipped to the browser). The routes fall back to keyword parsing when no key
// is set or a call fails, so the app never hard-fails.

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import type { SearchQuery, NavCommand, AccessibilityFeature } from './types';

const MODEL = 'claude-opus-4-8';
const apiKey = process.env.ANTHROPIC_API_KEY;

/** True when an API key is configured. */
export const hasClaude = Boolean(apiKey);

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey });
  return _client;
}

const ACCESS_VALUES = [
  'wheelchair', 'elevator', 'ground-floor', 'wide-doors',
  'grab-bars', 'hearing-loop', 'braille-signage',
] as const;

// ── search parser ──
const SearchSchema = z.object({
  maxRent: z.number().nullable(),
  minBeds: z.number().nullable(),
  accessibility: z.array(z.enum(ACCESS_VALUES)),
  programs: z.array(z.string()),
  city: z.string().nullable(),
});

const SEARCH_SYSTEM = `You convert a spoken sentence from someone searching for AFFORDABLE, ACCESSIBLE housing into a structured filter. Only fill a field if the user clearly stated it.
- maxRent: monthly rent ceiling in US dollars as a plain number ("under fifteen hundred" -> 1500, "no more than 2k" -> 2000); null if unstated.
- minBeds: "a one bedroom" -> 1, "studio" -> 0, "at least 2 bedrooms" -> 2; null if unstated.
- accessibility: choose ONLY from exactly these tags: wheelchair, elevator, ground-floor, wide-doors, grab-bars, hearing-loop, braille-signage. "no stairs" -> ground-floor; "ADA"/"mobility" -> wheelchair; "deaf-friendly" -> hearing-loop; "braille"/"blind-friendly" -> braille-signage. Empty array if none.
- programs: program names the user mentions, normalized to "Section 8" (also vouchers), "HUD" (also subsidized), "LIHTC" (also low-income tax credit). Empty array if none.
- city: a named city (Milpitas, San Jose, Santa Clara, Fremont, Sunnyvale), else null.
Do not invent values.`;

/** Parse a spoken housing request into a SearchQuery via Claude structured outputs. */
export async function extractSearchQuery(transcript: string): Promise<SearchQuery> {
  const msg = await client().messages.parse({
    model: MODEL,
    max_tokens: 512,
    system: SEARCH_SYSTEM,
    messages: [{ role: 'user', content: transcript }],
    output_config: { format: zodOutputFormat(SearchSchema) },
  });
  const p = msg.parsed_output;
  if (!p) throw new Error('search: no parsed_output');

  const q: SearchQuery = { transcript };
  if (p.maxRent != null) q.maxRent = p.maxRent;
  if (p.minBeds != null) q.minBeds = p.minBeds;
  if (p.accessibility.length) q.accessibility = p.accessibility as AccessibilityFeature[];
  if (p.programs.length) q.programs = p.programs;
  if (p.city) q.city = p.city;
  return q;
}

// ── nav parser ──
const NAV_TYPES = ['goto', 'next', 'prev', 'reset', 'turn', 'tilt', 'move', 'zoom', 'look', 'unknown'] as const;
const NAV_DIRS = ['left', 'right', 'around', 'up', 'down', 'forward', 'back', 'in', 'out'] as const;

const NavSchema = z.object({
  type: z.enum(NAV_TYPES),
  waypointId: z.string().nullable(),
  direction: z.enum(NAV_DIRS).nullable(),
  amount: z.number().nullable(),
  speech: z.string(),
});

function navSystem(waypoints: { id: string; label: string }[]): string {
  const list = waypoints.length
    ? waypoints.map((w) => `  - id "${w.id}" = ${w.label}`).join('\n')
    : '  (none)';
  return `You are the voice navigator for a first-person walkthrough of a 3D home. The user explores entirely hands-free, so map ANY spoken phrase to exactly ONE camera action, plus a short warm spoken confirmation ("speech", one sentence).

Named rooms in this tour (use these exact ids for a "goto"):
${list}

Choose ONE "type":
- "goto": go to a named room. Set waypointId to one of the ids above (never invent one). e.g. "take me to the kitchen", "show me the bedroom", "where's the living room".
- "next" / "prev": step to the next / previous room. ("continue", "keep going", "what's next" -> next; "go back", "previous room", "last one" -> prev).
- "reset": return to the entrance / start over. ("start over", "go to the beginning", "back to the front door").
- "turn": rotate the view in place. direction = "left", "right", or "around" (180°). amount = degrees if a number is given ("turn right ninety" -> 90), else null. e.g. "turn around", "look to your left", "spin right", "face the window on the right".
- "tilt": look up or down in place. direction = "up" or "down". amount = degrees if given, else null. e.g. "look up at the ceiling", "look down at the floor".
- "move": glide without turning. direction = "forward", "back", "left" (strafe), or "right" (strafe). amount = meters if given, else null. e.g. "step forward", "back up", "move closer to the window", "scoot left".
- "zoom": dolly the camera. direction = "in" (closer) or "out" (farther). e.g. "zoom in", "get a closer look", "zoom out", "pull back".
- "look": a generic glance when no specific direction is implied. e.g. "look around", "show me this".
- "unknown": the phrase is not a navigation request at all.

Rules:
- waypointId is null unless type is "goto". direction is null unless type is turn/tilt/move/zoom. amount is null unless a magnitude is clearly stated.
- If the user names a room that is not listed, pick the closest listed room with "goto", or "reset" if none fits, and say so warmly.
- Be liberal: almost every spatial phrase maps to turn/tilt/move/zoom/goto. Only use "unknown" for clearly non-navigation talk.`;
}

/** Parse a spoken tour command into a NavCommand via Claude, constrained to real waypoints. */
export async function extractNavCommand(
  transcript: string,
  waypoints: { id: string; label: string }[]
): Promise<NavCommand> {
  const msg = await client().messages.parse({
    model: MODEL,
    max_tokens: 220,
    system: navSystem(waypoints),
    messages: [{ role: 'user', content: transcript }],
    output_config: { format: zodOutputFormat(NavSchema) },
  });
  const p = msg.parsed_output;
  if (!p) throw new Error('nav: no parsed_output');

  if (p.type === 'goto') {
    const wp = waypoints.find((w) => w.id === p.waypointId);
    // Claude picked a non-existent id — let the deterministic parser try instead.
    if (!wp) return keywordNav(transcript, waypoints);
    return { type: 'goto', waypointId: wp.id, speech: p.speech || `Heading to the ${wp.label.toLowerCase()}.` };
  }

  const cmd: NavCommand = { type: p.type, speech: p.speech || 'Okay.' };
  if (p.direction) cmd.direction = p.direction;
  if (p.amount != null) cmd.amount = Math.abs(p.amount);
  return cmd;
}

/** Deterministic keyword fallback for nav (no key / Claude failure). Covers the
 *  full command vocabulary so voice-only navigation still works without Claude. */
export function keywordNav(
  transcript: string,
  waypoints: { id: string; label: string }[]
): NavCommand {
  const t = ` ${transcript.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()} `;
  const has = (re: RegExp) => re.test(t);
  const degMatch = t.match(/\b(\d{1,3})\b/);
  const deg = degMatch ? Math.max(1, Math.min(180, parseInt(degMatch[1], 10))) : undefined;

  // 1. Reset / start over (before "entrance" waypoint match so "start over" wins).
  if (has(/\b(reset|start over|restart|beginning|from the start|recenter|re center)\b/))
    return { type: 'reset', speech: 'Back to the start.' };

  // 2. Turn around / 180.
  if (has(/\b(turn|spin|rotate|face)\s+(around|round|back)\b/) || has(/\b(180|one eighty|other way|behind (me|you|us))\b/))
    return { type: 'turn', direction: 'around', amount: 180, speech: 'Turning around.' };

  // 3. Tilt up / down (check before generic up/down moves).
  if (has(/\b(look|tilt|tip|glance|aim|point)\s+(up|upward|upwards)\b/) || has(/\b(ceiling|above)\b/))
    return { type: 'tilt', direction: 'up', amount: deg, speech: 'Looking up.' };
  if (has(/\b(look|tilt|tip|glance|aim|point)\s+(down|downward|downwards)\b/) || has(/\b(floor|ground below)\b/))
    return { type: 'tilt', direction: 'down', amount: deg, speech: 'Looking down.' };

  // 4. Zoom / dolly.
  if (has(/\b(zoom in|closer|come closer|move in|get close|nearer|lean in)\b/))
    return { type: 'zoom', direction: 'in', speech: 'Zooming in.' };
  if (has(/\b(zoom out|pull back|further out|farther|zoom away)\b/))
    return { type: 'zoom', direction: 'out', speech: 'Zooming out.' };

  // 5. Move (strafing / forward / backward). "back up", "backward", "reverse" => move back.
  const moveVerb = has(/\b(move|step|walk|go|slide|scoot|strafe|come|head)\b/);
  // For "back", exclude go/come so "go back" / "come back" route to prev (step 8).
  const moveBackVerb = has(/\b(move|step|walk|slide|scoot|strafe)\b/);
  if (has(/\b(forward|forwards|ahead|straight)\b/))
    return { type: 'move', direction: 'forward', speech: 'Moving forward.' };
  if (has(/\b(backward|backwards|reverse)\b/) || has(/\bback up\b/) || (moveBackVerb && has(/\bback\b/)))
    return { type: 'move', direction: 'back', speech: 'Stepping back.' };
  if (moveVerb && has(/\bleft\b/)) return { type: 'move', direction: 'left', speech: 'Sliding left.' };
  if (moveVerb && has(/\bright\b/)) return { type: 'move', direction: 'right', speech: 'Sliding right.' };

  // 6. Turn / look left|right (rotate in place — the common "look that way").
  if (has(/\bleft\b/)) return { type: 'turn', direction: 'left', amount: deg, speech: 'Looking left.' };
  if (has(/\bright\b/)) return { type: 'turn', direction: 'right', amount: deg, speech: 'Looking right.' };

  // 7. Go to a named room (label or common synonym).
  const SYN: Record<string, RegExp> = {
    entrance: /\b(entrance|entry|entryway|foyer|front door|doorway|start)\b/,
    living: /\b(living|lounge|family room|great room|sitting)\b/,
    kitchen: /\b(kitchen|cook|counters?|stove)\b/,
    bedroom: /\b(bedroom|bed room|master|sleep)\b/,
    bathroom: /\b(bathroom|bath|restroom|washroom)\b/,
  };
  for (const w of waypoints) {
    const label = w.label.toLowerCase();
    const key = Object.keys(SYN).find((k) => label.includes(k));
    if ((key && has(SYN[key])) || has(new RegExp(`\\b${label.replace(/\s+/g, '\\s+')}\\b`)))
      return { type: 'goto', waypointId: w.id, speech: `Heading to the ${label}.` };
  }

  // 8. Next / previous stop.
  if (has(/\b(next|continue|keep going|onward|what.?s next|move on)\b/))
    return { type: 'next', speech: 'On to the next stop.' };
  if (has(/\b(prev|previous|go back|last one|before|back)\b/))
    return { type: 'prev', speech: 'Going back.' };

  // 9. Generic look-around.
  if (has(/\b(look|around|turn|view|see)\b/)) return { type: 'look', speech: 'Looking around.' };

  // Nothing matched — signal a miss.
  return { type: 'unknown', speech: '' };
}

/** Tiny liveness probe used by /api/health. */
export async function pingClaude(): Promise<boolean> {
  try {
    await client().messages.create({
      model: MODEL,
      max_tokens: 4,
      messages: [{ role: 'user', content: 'ping' }],
    });
    return true;
  } catch {
    return false;
  }
}

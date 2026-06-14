// lib/claude.ts — Claude (claude-opus-4-8) parsers, adapted to the shared
// contract in lib/types.ts. OWNED BY SHAURYA. Server-side only (API key never
// shipped to the browser). The routes fall back to keyword parsing when no key
// is set or a call fails, so the app never hard-fails.

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import type { SearchQuery, NavCommand, AccessibilityFeature } from './types';
import type { AppCommand, AppCommandContext } from './commandTypes';

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
- "unknown": the phrase is NOT a movement request — MOST IMPORTANTLY, any QUESTION or request for INFORMATION about the home (its price, rent, value, deposit, size, square footage, bedrooms/bathrooms, accessibility, year built, pets, parking, laundry, programs, neighborhood/transit, or phrasings like "tell me about…", "how much…", "how many…", "is it…", "is there…", "does it have…", "what is…", "can I…"). Return "unknown" for these so the home Q&A answers them.

Rules:
- waypointId is null unless type is "goto". direction is null unless type is turn/tilt/move/zoom. amount is null unless a magnitude is clearly stated.
- If the user names a room that is not listed, pick the closest listed room with "goto", or "reset" if none fits, and say so warmly.
- Movement vs. question: choose a movement type ONLY when the user wants to GO or LOOK somewhere ("take me to…", "go to…", "show me the kitchen", "turn around", "look up", "move forward", "zoom in", "next room"). If they are asking ABOUT the home rather than moving through it, return "unknown" — the Q&A will handle it.`;
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
    entrance: /\b(entrance|entry|entryway|foyer|front door|doorway|overview|start|beginning)\b/,
    bookshel: /\b(bookshel\w*|book\s*shel\w*|books?|shelves|shelf|storage|library)\b/,
    desk: /\b(desk|study|office|work\s*space|workspace|computer|window)\b/,
    play: /\b(play\s*corner|play\s*area|play|toys?|mat|kids?|reading|nook)\b/,
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

// ── house Q&A ──
const ASK_SYSTEM = `You are the voice of a smart, warm AI guide helping someone explore ONE specific affordable, accessible home entirely hands-free. Answer ANY spoken question about THIS home using ONLY the facts provided below. Your answer is read ALOUD, so it must sound natural.

- Sound like a knowledgeable person standing in the home with them: friendly, direct, 1-3 short sentences. No lists, no markdown.
- Use everything in the facts, and you MAY reason over them — combine or derive when it's grounded (e.g. compute price per square foot, infer "near transit" from the description, judge if it fits a mobility need from the accessibility features).
- If they're viewing a specific room, ground the answer there when relevant.
- HONESTY RULE: if the specific detail they asked about is NOT in the facts, say so plainly — e.g. "That information isn't listed for this home, but I can have the realtor confirm it for you." NEVER invent prices, dates, square footage, room counts, names, policies, or features. Saying "it's not listed" is always better than guessing.
- If the question isn't about this home at all, gently steer back to the home.
- Accessibility-first product: be clear, concrete, and kind.`;

/** Answer a natural-language question about a specific home using its facts brief. */
export async function answerHouseQuestion(
  question: string,
  brief: string,
  room?: string
): Promise<string> {
  const ctx = room ? `\n\nThe person is currently viewing: ${room}.` : '';
  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: 240,
    system: ASK_SYSTEM,
    messages: [{ role: 'user', content: `HOME FACTS:\n${brief}${ctx}\n\nTHEIR QUESTION: ${question}` }],
  });
  const text = msg.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join(' ')
    .trim();
  return text || "I'm not certain about that — I can have the realtor follow up with you.";
}

// ── app command brain (agentic voice control across the whole app) ──
const APP_ACTIONS = ['search', 'open_house', 'go_page', 'tour_nav', 'question', 'book', 'none'] as const;
const APP_PAGES = ['finder', 'dashboard', 'home'] as const;

const CommandSchema = z.object({
  action: z.enum(APP_ACTIONS),
  houseId: z.string().nullable(),
  page: z.enum(APP_PAGES).nullable(),
  preferredTime: z.string().nullable(),
  speech: z.string(),
});

function commandSystem(ctx: AppCommandContext): string {
  const where = ctx.page === 'finder'
    ? 'the SEARCH page (a scrollable list of home results)'
    : 'INSIDE a first-person 3D walkthrough of ONE specific home';
  const list = ctx.listings?.length
    ? ctx.listings
        .map((l, i) => `  ${i + 1}. id "${l.id}" — ${l.address}, ${l.city}, $${l.rent}/mo, ${l.beds === 0 ? 'studio' : l.beds + 'bd'}`)
        .join('\n')
    : '  (no current results)';
  const ctxBlock = ctx.page === 'finder'
    ? `Current search results (use the EXACT id for open_house):\n${list}\n`
    : `They are currently touring listing id "${ctx.listingId ?? 'unknown'}".\n`;
  return `You are the voice command router for Haven, a hands-free affordable-housing app. The user is on ${where}. Map their spoken words to exactly ONE app action plus a short, warm spoken confirmation ("speech", one sentence).

${ctxBlock}
Choose ONE "action":
- "search": they're describing a home to FIND — criteria like beds, price, city, accessibility. e.g. "two bedroom under fifteen hundred", "wheelchair accessible in Milpitas".
- "open_house": they want to OPEN / VIEW / TOUR / step inside a SPECIFIC result. Set houseId to the matching id from the list (resolve "the first one", "the cheapest", "the Milpitas one", an address or rent). e.g. "open the first one", "take me into 421 Oak", "view the cheapest".
- "go_page": navigate to another screen. page = "finder" (search / "go back"), "dashboard" (activity dashboard), or "home" (landing page). e.g. "go back to search", "open the dashboard", "go home".
- "book": they want to BOOK a viewing / appointment and/or have the agent CALL the realtor for this home. Set preferredTime to any time mentioned ("this weekend", "tomorrow evening"), else null. e.g. "book a viewing", "schedule a tour for Saturday", "book it and call the realtor".
- "tour_nav": (tour only) they want to MOVE or LOOK in the 3D space — walk, turn, go to a room. e.g. "go to the kitchen", "turn around", "look up", "next room".
- "question": they're ASKING something about the home (price, size, accessibility, features, year, pets…). e.g. "how much is rent", "is it wheelchair accessible".
- "none": greeting, unclear, or unrelated to the app.

Rules:
- houseId is set ONLY for open_house and MUST be one of the ids listed above (NEVER invent one). "open it" / "this one" while already touring is NOT open_house.
- page is set ONLY for go_page.
- On the finder, default to "search" unless they clearly reference opening a specific result or another screen. In the tour, default to "tour_nav" for spatial phrases and "question" for everything else informational.`;
}

/** Classify a spoken utterance into an app-wide action (agentic voice control). */
export async function parseAppCommand(transcript: string, ctx: AppCommandContext): Promise<AppCommand> {
  const msg = await client().messages.parse({
    model: MODEL,
    max_tokens: 200,
    system: commandSystem(ctx),
    messages: [{ role: 'user', content: transcript }],
    output_config: { format: zodOutputFormat(CommandSchema) },
  });
  const p = msg.parsed_output;
  if (!p) throw new Error('command: no parsed_output');

  const cmd: AppCommand = { action: p.action, speech: p.speech || 'Okay.' };
  if (p.action === 'open_house') {
    // Constrain to a real id; if Claude invented one, defer to the deterministic parser.
    if (p.houseId && ctx.listings?.some((l) => l.id === p.houseId)) cmd.houseId = p.houseId;
    else return keywordCommand(transcript, ctx);
  }
  if (p.action === 'go_page' && p.page) cmd.page = p.page;
  if (p.preferredTime) cmd.preferredTime = p.preferredTime;
  return cmd;
}

function resolveHouseRef(
  t: string,
  listings: NonNullable<AppCommandContext['listings']>
): string | undefined {
  const ord: Record<string, number> = {
    first: 0, '1st': 0, second: 1, '2nd': 1, third: 2, '3rd': 2, fourth: 3, '4th': 3, last: listings.length - 1,
  };
  for (const [w, i] of Object.entries(ord)) {
    if (new RegExp(`\\b${w}\\b`).test(t) && listings[i]) return listings[i].id;
  }
  if (/\b(cheapest|lowest|least expensive|most affordable)\b/.test(t)) {
    return [...listings].sort((a, b) => a.rent - b.rent)[0]?.id;
  }
  for (const l of listings) if (t.includes(l.city.toLowerCase())) return l.id;
  for (const l of listings) {
    const num = l.address.match(/^\d+/)?.[0];
    if (num && t.includes(num)) return l.id;
  }
  if (/\b(it|that one|this one|the home|the house|that home|that place)\b/.test(t) && listings.length) return listings[0].id;
  return undefined;
}

/** Deterministic command fallback (no key / Claude failure). */
export function keywordCommand(transcript: string, ctx: AppCommandContext): AppCommand {
  const t = ` ${transcript.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()} `;
  const has = (re: RegExp) => re.test(t);

  if (has(/\b(dashboard|activity feed|activity)\b/)) return { action: 'go_page', page: 'dashboard', speech: 'Opening the dashboard.' };
  if (has(/\b(back to (search|finder)|search page|find (another|more|a different)|new search|go back)\b/)) return { action: 'go_page', page: 'finder', speech: 'Back to search.' };
  if (has(/\b(home page|landing page|main page|go home)\b/)) return { action: 'go_page', page: 'home', speech: 'Going home.' };

  if (
    has(/\b(book|schedule|set up|arrange|make)\b.{0,24}\b(viewing|tour|appointment|showing|visit)\b/) ||
    has(/\bbook it\b/) ||
    has(/\bcall (the )?(realtor|agent|them|her|him)\b/) ||
    has(/\bset up an appointment\b/)
  ) {
    return { action: 'book', speech: 'Setting up the viewing and calling the realtor.' };
  }

  if (ctx.page === 'finder' && ctx.listings?.length && has(/\b(open|view|tour|walk|step inside|take me|show me|see)\b/)) {
    const id = resolveHouseRef(t, ctx.listings);
    if (id) return { action: 'open_house', houseId: id, speech: 'Opening that home.' };
  }

  if (ctx.page === 'tour' && has(/\b(go to|take me|kitchen|bedroom|living|entrance|bookshelf|desk|play|turn|look|move|forward|back|zoom|next|previous|around|left|right|up|down)\b/)) {
    return { action: 'tour_nav', speech: '' };
  }

  return ctx.page === 'finder' ? { action: 'search', speech: '' } : { action: 'question', speech: '' };
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

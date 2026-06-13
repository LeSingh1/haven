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
const NavSchema = z.object({
  type: z.enum(['goto', 'look', 'reset', 'next', 'prev']),
  waypointId: z.string().nullable(),
  speech: z.string(),
});

function navSystem(waypoints: { id: string; label: string }[]): string {
  const list = waypoints.length
    ? waypoints.map((w) => `  - id "${w.id}" = ${w.label}`).join('\n')
    : '  (none)';
  return `You translate a spoken command into ONE navigation action for a first-person walkthrough of a 3D home, plus a short warm spoken confirmation ("speech").
Rooms available in this tour (use these exact ids for waypointId):
${list}
Action types:
- "goto": go to a named room — set waypointId to one of the ids above (never invent one).
- "next": go to the next stop. "prev": go to the previous stop. "reset": return to the entrance/start.
- "look": glance around without moving to a specific stop.
If the user names a room not in the list, use "reset" and say you couldn't find it.
Set waypointId to null for next/prev/reset/look. Keep "speech" to one short sentence.`;
}

/** Parse a spoken tour command into a NavCommand via Claude, constrained to real waypoints. */
export async function extractNavCommand(
  transcript: string,
  waypoints: { id: string; label: string }[]
): Promise<NavCommand> {
  const msg = await client().messages.parse({
    model: MODEL,
    max_tokens: 200,
    system: navSystem(waypoints),
    messages: [{ role: 'user', content: transcript }],
    output_config: { format: zodOutputFormat(NavSchema) },
  });
  const p = msg.parsed_output;
  if (!p) throw new Error('nav: no parsed_output');

  if (p.type === 'goto') {
    const wp = waypoints.find((w) => w.id === p.waypointId);
    if (!wp) return { type: 'reset', speech: "I couldn't find that room — back to the entrance." };
    return { type: 'goto', waypointId: wp.id, speech: p.speech || `Heading to the ${wp.label.toLowerCase()}.` };
  }
  return { type: p.type, speech: p.speech || 'Okay.' };
}

/** Deterministic keyword fallback for nav (no key / Claude failure). */
export function keywordNav(
  transcript: string,
  waypoints: { id: string; label: string }[]
): NavCommand {
  const t = transcript.toLowerCase();
  for (const w of waypoints) {
    if (w.label.toLowerCase().split(/\s+/).some((word) => word.length > 2 && t.includes(word))) {
      return { type: 'goto', waypointId: w.id, speech: `Heading to the ${w.label.toLowerCase()}.` };
    }
  }
  if (/\b(reset|start|beginning|entrance|front|home)\b/.test(t)) return { type: 'reset', speech: 'Back to the entrance.' };
  if (/\b(next|forward|ahead|continue)\b/.test(t)) return { type: 'next', speech: 'Moving to the next stop.' };
  if (/\b(back|previous|prev|before)\b/.test(t)) return { type: 'prev', speech: 'Going back.' };
  if (/\b(look|around|turn)\b/.test(t)) return { type: 'look', speech: 'Looking around.' };
  return { type: 'look', speech: '' };
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

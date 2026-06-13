// app/api/nav/route.ts — Part 2 tour-navigation endpoint. OWNED BY SHAURYA.
// Speech transcript + the tour's available waypoints -> NavCommand (Claude, or
// keyword fallback). Matches the frontend contract: returns NavParseResponse.

import { hasClaude, extractNavCommand, keywordNav } from '@/lib/claude';
import type { NavCommand, NavParseResponse } from '@/lib/types';

export const runtime = 'nodejs';

interface Body {
  transcript?: string;
  waypoints?: { id: string; label: string }[];
}

export async function POST(req: Request): Promise<Response> {
  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    /* handled below */
  }
  const transcript = (body.transcript ?? '').trim();
  const waypoints = body.waypoints ?? [];

  if (!transcript) {
    const err: NavParseResponse = {
      ok: false,
      command: { type: 'reset', speech: '' },
      spokenFallback: "I didn't catch that. Try 'take me to the kitchen', 'next', or 'back'.",
    };
    return Response.json(err);
  }

  let command: NavCommand;
  if (hasClaude) {
    try {
      command = await extractNavCommand(transcript, waypoints);
    } catch (e) {
      console.error('[nav] Claude failed, using keyword fallback:', e);
      command = keywordNav(transcript, waypoints);
    }
  } else {
    command = keywordNav(transcript, waypoints);
  }

  // keywordNav returns an empty 'look' when nothing matched — surface that as a miss.
  if (command.type === 'look' && !command.speech) {
    const labels = waypoints.map((w) => `"${w.label.toLowerCase()}"`).join(', ');
    const miss: NavParseResponse = {
      ok: false,
      command: { type: 'reset', speech: '' },
      spokenFallback: `I didn't catch that. Try ${labels}, "next", or "back".`,
    };
    return Response.json(miss);
  }

  const resp: NavParseResponse = { ok: true, command };
  return Response.json(resp);
}

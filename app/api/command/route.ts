// app/api/command/route.ts — the app-wide voice command brain. Classifies a
// spoken utterance (with the user's current context) into ONE app action:
// search / open_house / go_page / tour_nav / question / book. Claude when keyed,
// deterministic keyword fallback otherwise. Never throws.
import { hasClaude, parseAppCommand, keywordCommand } from '@/lib/claude';
import type { AppCommandContext } from '@/lib/commandTypes';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  let body: { transcript?: string; context?: AppCommandContext } = {};
  try {
    body = await req.json();
  } catch {
    /* handled below */
  }
  const transcript = (body.transcript ?? '').trim();
  const ctx: AppCommandContext = body.context ?? { page: 'finder' };

  if (!transcript) {
    return Response.json({ action: 'none', speech: "I didn't catch that." });
  }

  if (!hasClaude) return Response.json(keywordCommand(transcript, ctx));

  try {
    return Response.json(await parseAppCommand(transcript, ctx));
  } catch (e) {
    console.error('[command] Claude failed, using keyword fallback:', e);
    return Response.json(keywordCommand(transcript, ctx));
  }
}

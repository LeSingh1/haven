// app/api/calls/route.ts — list the realtor calls placed this session (most recent
// first). Each record carries the conversationId; the UI fetches the transcript for
// a given call from /api/appointment/status?id=<conversationId>.
import { getCalls } from '@/lib/callsStore';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  return Response.json({ ok: true, calls: getCalls() });
}

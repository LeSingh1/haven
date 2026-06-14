// app/api/appointment/status/route.ts — poll the live status + transcript of an
// in-flight realtor call. GET ?id=<conversation_id>. Used by the booking UI to
// stream the agent/realtor conversation as it happens. Read-only; never throws.
import { getCallStatus } from '@/lib/realtorCall';

export const runtime = 'nodejs';

export async function GET(req: Request): Promise<Response> {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) {
    return Response.json(
      { ok: false, status: 'unknown', ended: false, transcript: [], message: 'Missing ?id.' },
      { status: 400 }
    );
  }
  const result = await getCallStatus(id);
  return Response.json(result);
}

// app/api/activity/route.ts — activity feed for the dashboard.
// GET  -> recent events + stats. POST { type, detail, meta } -> record an event.
import { logActivity, getActivity, activityStats, type ActivityType } from '@/lib/activityStore';

export const runtime = 'nodejs';

const TYPES: ActivityType[] = ['search', 'tour_open', 'navigate', 'question', 'appointment'];

export async function GET(): Promise<Response> {
  return Response.json({ ok: true, events: getActivity(50), stats: activityStats() });
}

export async function POST(req: Request): Promise<Response> {
  let body: { type?: string; detail?: string; meta?: Record<string, unknown> } = {};
  try {
    body = await req.json();
  } catch {
    /* handled below */
  }
  const type = body.type as ActivityType;
  if (!TYPES.includes(type) || !body.detail) {
    return Response.json({ ok: false, message: 'invalid_event' }, { status: 400 });
  }
  const ev = logActivity(type, String(body.detail).slice(0, 200), body.meta);
  return Response.json({ ok: true, event: ev });
}

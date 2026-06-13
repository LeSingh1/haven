// lib/activityStore.ts — server-side in-memory activity log. Records what users do
// (searches, tours, questions, bookings) so the /dashboard can show live activity.
// NOTE: in-memory + capped — resets on server restart and is per-instance (fine for
// a demo / single instance; swap for Redis/DB if you need durable, multi-instance logs).
// Only imported by API routes (Node runtime), so it never reaches the client bundle.

export type ActivityType = 'search' | 'tour_open' | 'navigate' | 'question' | 'appointment';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  detail: string;
  meta?: Record<string, unknown>;
  ts: number; // epoch ms
}

const MAX = 200;
// Survive Next.js dev hot-reloads by stashing on globalThis.
const g = globalThis as unknown as { __havenActivity?: ActivityEvent[] };
const log: ActivityEvent[] = g.__havenActivity ?? (g.__havenActivity = []);
let seq = 0;

export function logActivity(type: ActivityType, detail: string, meta?: Record<string, unknown>): ActivityEvent {
  const ev: ActivityEvent = { id: `ev-${Date.now()}-${seq++}`, type, detail, meta, ts: Date.now() };
  log.unshift(ev);
  if (log.length > MAX) log.length = MAX;
  return ev;
}

export function getActivity(limit = 50): ActivityEvent[] {
  return log.slice(0, limit);
}

export function activityStats() {
  const counts: Record<string, number> = {};
  for (const e of log) counts[e.type] = (counts[e.type] ?? 0) + 1;
  return { total: log.length, counts };
}

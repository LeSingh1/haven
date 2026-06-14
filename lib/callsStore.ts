// lib/callsStore.ts — in-memory log of realtor calls placed via /api/appointment.
// Records WHO was called for WHICH property, plus the ElevenLabs conversationId so
// the transcript can be fetched later (via /api/appointment/status). In-memory +
// capped: resets on server restart, per-instance — fine for a demo. Imported only
// by API routes (Node runtime), so it never reaches the client bundle.

export interface CallRecord {
  id: string;
  conversationId: string | null;
  simulated: boolean;
  listingId: string;
  address: string;
  realtorName: string;
  realtorPhone: string;
  callerName: string;
  preferredTime: string;
  dialed?: string;
  ts: number; // epoch ms
}

const MAX = 100;
// Survive Next.js dev hot-reloads by stashing on globalThis.
const g = globalThis as unknown as { __havenCalls?: CallRecord[] };
const log: CallRecord[] = g.__havenCalls ?? (g.__havenCalls = []);
let seq = 0;

export function logCall(rec: Omit<CallRecord, 'id' | 'ts'>): CallRecord {
  const r: CallRecord = { ...rec, id: `call-${Date.now()}-${seq++}`, ts: Date.now() };
  log.unshift(r);
  if (log.length > MAX) log.length = MAX;
  return r;
}

export function getCalls(limit = 50): CallRecord[] {
  return log.slice(0, limit);
}

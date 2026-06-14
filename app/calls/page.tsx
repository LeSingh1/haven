'use client';
// app/calls/page.tsx — Call History. Lists every realtor call placed this session
// (who, which property, when) and expands to the conversation transcript pulled
// from /api/appointment/status. Matches the dashboard aesthetic.
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, fadeUpSm, EASE_OUT } from '@/lib/motion';

interface CallRecord {
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
  ts: number;
}
interface Turn {
  role: string;
  text: string;
}
interface Thread {
  turns: Turn[];
  status: string;
  loading: boolean;
}

function ago(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

export default function CallsPage() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, Thread>>({});

  useEffect(() => {
    let on = true;
    const pull = async () => {
      try {
        const r = await fetch('/api/calls', { cache: 'no-store' });
        const d = await r.json();
        if (on && d.ok) setCalls(d.calls);
      } catch {
        /* ignore */
      }
      if (on) setLoading(false);
    };
    pull();
    const id = setInterval(pull, 4000);
    return () => {
      on = false;
      clearInterval(id);
    };
  }, []);

  const loadThread = useCallback(async (c: CallRecord) => {
    if (!c.conversationId) return;
    setThreads((t) => ({ ...t, [c.id]: { turns: t[c.id]?.turns ?? [], status: '', loading: true } }));
    try {
      const r = await fetch(`/api/appointment/status?id=${encodeURIComponent(c.conversationId)}`, { cache: 'no-store' });
      const d = await r.json();
      setThreads((t) => ({
        ...t,
        [c.id]: { turns: Array.isArray(d.transcript) ? d.transcript : [], status: d.status ?? '', loading: false },
      }));
    } catch {
      setThreads((t) => ({ ...t, [c.id]: { turns: [], status: 'error', loading: false } }));
    }
  }, []);

  const toggle = (c: CallRecord) => {
    if (openId === c.id) {
      setOpenId(null);
      return;
    }
    setOpenId(c.id);
    loadThread(c);
  };

  return (
    <main className="relative mx-auto min-h-dvh max-w-3xl px-5 py-10 sm:py-14">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <Link href="/" className="text-xs text-textdim hover:text-text">← Haven</Link>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-text">Call history</h1>
          <p className="text-sm text-textdim">Every realtor the AI agent called — and what was said.</p>
        </div>
        <Link href="/dashboard" className="btn-ghost inline-flex min-h-[38px] shrink-0 items-center rounded-lg px-3.5 text-xs font-semibold">
          Activity →
        </Link>
      </header>

      {loading ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-textdim">Loading calls…</div>
      ) : calls.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-textdim">
          No calls yet. Open a tour and say{' '}
          <span className="text-accent">&ldquo;book a viewing and call the realtor&rdquo;</span> — the call will appear here.
        </div>
      ) : (
        <motion.ul variants={staggerContainer(0.04)} initial="hidden" animate="show" className="space-y-3">
          {calls.map((c) => {
            const open = openId === c.id;
            const th = threads[c.id];
            return (
              <motion.li key={c.id} variants={fadeUpSm} className="glass overflow-hidden rounded-2xl">
                {/* Row */}
                <button
                  type="button"
                  onClick={() => toggle(c)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.03]"
                  aria-expanded={open}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-accent/40 bg-accent/10 text-accent">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text">{c.realtorName}</p>
                    <p className="truncate text-xs text-textdim">{c.address || c.listingId}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={[
                        'rounded-full px-2 py-0.5 text-[10px] font-medium',
                        c.simulated ? 'bg-warn/15 text-warn' : 'bg-good/15 text-good',
                      ].join(' ')}
                    >
                      {c.simulated ? 'Simulated' : 'Called'}
                    </span>
                    <span className="text-[11px] tabular-nums text-textdim">{ago(c.ts)}</span>
                  </div>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden
                    className={`shrink-0 text-textdim transition-transform ${open ? 'rotate-180' : ''}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {/* Meta + transcript */}
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: EASE_OUT }}
                      className="overflow-hidden border-t border-white/10"
                    >
                      <div className="px-4 py-3">
                        <div className="mb-3 flex flex-wrap gap-1.5 text-[11px]">
                          <Chip>Requested by {c.callerName}</Chip>
                          <Chip>Preferred: {c.preferredTime}</Chip>
                          {c.dialed && <Chip>Dialed {c.dialed}</Chip>}
                        </div>

                        {!c.conversationId ? (
                          <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-textdim">
                            Simulated request — no live call was placed, so there&apos;s no transcript. The realtor would
                            be reached at {c.realtorPhone || 'their listed number'}.
                          </p>
                        ) : th?.loading && !th.turns.length ? (
                          <p className="p-3 text-center text-xs text-textdim">Loading transcript…</p>
                        ) : th && th.turns.length ? (
                          <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3">
                            {th.turns.map((t, i) => {
                              const agent = t.role === 'agent';
                              return (
                                <div key={i} className={agent ? 'flex justify-end' : 'flex justify-start'}>
                                  <div
                                    className={[
                                      'max-w-[82%] rounded-2xl px-3 py-1.5 text-xs leading-relaxed',
                                      agent ? 'bg-accent/15 text-text' : 'bg-white/[0.07] text-textdim',
                                    ].join(' ')}
                                  >
                                    <span className="mb-0.5 block text-[9px] uppercase tracking-wider text-textdim/70">
                                      {agent ? 'Haven agent' : c.realtorName}
                                    </span>
                                    {t.text}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-textdim">
                            No transcript available yet — the call may still be connecting or just finished. Reopen in a
                            moment to refresh.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </main>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/12 bg-white/[0.05] px-2 py-0.5 text-textdim">{children}</span>
  );
}

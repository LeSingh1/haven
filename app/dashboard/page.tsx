'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import type { ActivityEvent } from '@/lib/activityStore';
import { staggerContainer, fadeUpSm } from '@/lib/motion';
import AnimatedNumber from '@/components/AnimatedNumber';

const META: Record<string, { label: string; color: string; icon: string }> = {
  search: { label: 'Search', color: 'text-accent', icon: 'M21 21l-4.3-4.3M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z' },
  tour_open: { label: 'Tour', color: 'text-good', icon: 'M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6' },
  navigate: { label: 'Move', color: 'text-text', icon: 'M5 12h14M13 6l6 6-6 6' },
  question: { label: 'Question', color: 'text-warn', icon: 'M12 17h.01M12 13a3 3 0 1 0-3-3' },
  appointment: { label: 'Booking', color: 'text-good', icon: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18' },
};

function ago(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

export default function DashboardPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [stats, setStats] = useState<{ total: number; counts: Record<string, number> }>({ total: 0, counts: {} });
  const [live, setLive] = useState(true);

  useEffect(() => {
    let on = true;
    const pull = async () => {
      try {
        const r = await fetch('/api/activity', { cache: 'no-store' });
        const d = await r.json();
        if (on && d.ok) { setEvents(d.events); setStats(d.stats); }
      } catch { /* ignore */ }
    };
    pull();
    const id = setInterval(pull, 2500);
    return () => { on = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setLive((l) => !l), 1100);
    return () => clearTimeout(t);
  }, [live]);

  return (
    <main className="relative mx-auto min-h-dvh max-w-3xl px-5 py-10 sm:py-14">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <Link href="/" className="text-xs text-textdim hover:text-text">← Haven</Link>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-text">Activity</h1>
          <p className="text-sm text-textdim">Live log of what people are doing across Haven.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-good/40 bg-good/10 px-3 py-1 text-xs text-good">
          <span className={`h-1.5 w-1.5 rounded-full bg-good transition-opacity ${live ? 'opacity-100' : 'opacity-30'}`} />
          Live
        </span>
      </header>

      {/* Stat tiles */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(['search', 'tour_open', 'question', 'appointment'] as const).map((k) => (
          <div key={k} className="glass rounded-xl p-3">
            <AnimatedNumber value={stats.counts[k] ?? 0} className="block text-2xl font-bold tabular-nums text-text" />
            <p className="text-[11px] uppercase tracking-wider text-textdim">
              {({ search: 'Searches', tour_open: 'Tours', question: 'Questions', appointment: 'Bookings' } as Record<string, string>)[k]}
            </p>
          </div>
        ))}
        <div className="glass rounded-xl p-3">
          <AnimatedNumber value={stats.total} className="block text-2xl font-bold tabular-nums text-accent" />
          <p className="text-[11px] uppercase tracking-wider text-textdim">Total</p>
        </div>
      </div>

      {/* Feed */}
      {events.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-textdim">
          No activity yet. Open the app in another tab — searches, tours, questions, and bookings show up here in real time.
        </div>
      ) : (
        <motion.ul variants={staggerContainer(0.03)} initial="hidden" animate="show" className="space-y-2">
          <AnimatePresence initial={false}>
            {events.map((e) => {
              const m = META[e.type] ?? META.navigate;
              return (
                <motion.li
                  key={e.id}
                  layout
                  variants={fadeUpSm}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass flex items-center gap-3 rounded-xl px-4 py-2.5"
                >
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] ${m.color}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={m.icon} /></svg>
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm text-text">{e.detail}</p>
                  <span className="shrink-0 text-[11px] tabular-nums text-textdim">{ago(e.ts)}</span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      )}
    </main>
  );
}

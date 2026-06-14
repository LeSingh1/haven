'use client';
// CallStatusCard — the "what happens after you book" view. Streams the live
// realtor call placed by /api/appointment: polls /api/appointment/status for the
// agent⇄realtor transcript and renders it as it happens. Looks polished in every
// state (connecting / live / ended / simulated) so the demo never shows an empty box.
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockListings } from '@/lib/mockListings';
import { EASE_OUT } from '@/lib/motion';

interface Turn {
  role: string;
  text: string;
}

interface Props {
  conversationId: string | null;
  simulated: boolean;
  realtorName: string;
  buyerPhone: string;
  listingId: string;
  address: string;
  preferredTime: string;
  onClose: () => void;
}

function mmss(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export default function CallStatusCard({
  conversationId,
  simulated,
  realtorName,
  buyerPhone,
  listingId,
  address,
  preferredTime,
  onClose,
}: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [ended, setEnded] = useState(false);
  const [secs, setSecs] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isSim = simulated || !conversationId;
  const listing = mockListings.find((l) => l.id === listingId);

  // Elapsed-time ticker (only for a live call).
  useEffect(() => {
    if (isSim) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isSim]);

  // Poll the live transcript until the call ends (cap ~2 min so it never spins forever).
  useEffect(() => {
    if (isSim || !conversationId) return;
    let on = true;
    let polls = 0;
    const stop = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    const poll = async () => {
      polls += 1;
      try {
        const r = await fetch(`/api/appointment/status?id=${encodeURIComponent(conversationId)}`, {
          cache: 'no-store',
        });
        const d = await r.json();
        if (!on) return;
        if (Array.isArray(d.transcript) && d.transcript.length) setTurns(d.transcript);
        if (d.ended || polls > 55) {
          setEnded(true);
          stop();
        }
      } catch {
        /* transient — keep polling */
      }
    };
    poll();
    pollRef.current = setInterval(poll, 2200);
    return () => {
      on = false;
      stop();
    };
  }, [conversationId, isSim]);

  // Keep the transcript scrolled to the newest turn.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  const phase: 'simulated' | 'ended' | 'live' | 'connecting' = isSim
    ? 'simulated'
    : ended
      ? 'ended'
      : turns.length
        ? 'live'
        : 'connecting';

  const statusLabel =
    phase === 'simulated'
      ? 'Request sent'
      : phase === 'ended'
        ? 'Call complete'
        : phase === 'live'
          ? `On the call · ${mmss(secs)}`
          : 'Dialing…';

  return (
    <div className="px-6 pb-6 pt-5">
      {/* Header: live call indicator */}
      <div className="flex items-center gap-3">
        <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-accent/40 bg-accent/10 text-accent">
          {phase === 'ended' || phase === 'simulated' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
            </svg>
          )}
          {(phase === 'connecting' || phase === 'live') && (
            <span className="absolute inset-0 animate-ping rounded-full border border-accent/50" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-white/45">{statusLabel}</p>
          <p className="truncate text-base font-bold text-white">
            {phase === 'simulated' ? `Booking ${realtorName}` : `Calling ${realtorName}`}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-white/45 hover:text-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* What the agent is requesting — always shown, so the call has context even
          before the realtor picks up. */}
      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-accent/80">The AI agent is requesting</p>
        <p className="text-sm font-medium text-white">A viewing of {address || listing?.address}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {listing && (
            <Chip>${listing.rent.toLocaleString()}/mo</Chip>
          )}
          {listing && <Chip>{listing.beds === 0 ? 'Studio' : `${listing.beds} bd`} · {listing.baths} ba</Chip>}
          <Chip>{preferredTime || 'Flexible'}</Chip>
          {listing?.accessibility?.slice(0, 2).map((a) => <Chip key={a}>{a}</Chip>)}
        </div>
      </div>

      {/* Live transcript */}
      {!isSim && (
        <div
          ref={scrollRef}
          className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3"
        >
          {turns.length === 0 ? (
            <div className="flex items-center gap-2 py-6 text-center text-xs text-white/45">
              <span className="mx-auto inline-flex items-center gap-1.5">
                <Dot /> <Dot d={0.15} /> <Dot d={0.3} />
                <span className="ml-1">Connecting you to {realtorName}…</span>
              </span>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {turns.map((t, i) => {
                const mine = t.role === 'agent';
                return (
                  <motion.div
                    key={`${i}-${t.text.slice(0, 12)}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: EASE_OUT }}
                    className={mine ? 'flex justify-end' : 'flex justify-start'}
                  >
                    <div className={['max-w-[82%] rounded-2xl px-3 py-1.5 text-xs leading-relaxed',
                      mine ? 'bg-accent/15 text-white' : 'bg-white/[0.07] text-white/85'].join(' ')}>
                      <span className="mb-0.5 block text-[9px] uppercase tracking-wider text-white/40">
                        {mine ? 'Haven agent' : realtorName}
                      </span>
                      {t.text}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      )}

      {/* Footer line + action */}
      <p className="mt-4 text-center text-xs text-white/55">
        {phase === 'ended'
          ? `${realtorName} has the request — they'll confirm at ${buyerPhone}.`
          : phase === 'simulated'
            ? `Request logged. ${realtorName} will confirm at ${buyerPhone}.`
            : `${realtorName} will confirm the time at ${buyerPhone}.`}
      </p>
      <button
        type="button"
        onClick={onClose}
        className={['mt-3 min-h-[44px] w-full rounded-xl text-sm font-semibold',
          phase === 'ended' || phase === 'simulated' ? 'btn-neon' : 'btn-ghost'].join(' ')}
      >
        {phase === 'ended' || phase === 'simulated' ? 'Done' : 'Run in background'}
      </button>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/12 bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/75">
      {children}
    </span>
  );
}

function Dot({ d = 0 }: { d?: number }) {
  return (
    <motion.span
      className="inline-block h-1.5 w-1.5 rounded-full bg-accent"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: d }}
    />
  );
}

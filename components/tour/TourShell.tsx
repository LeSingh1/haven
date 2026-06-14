'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { TourMeta, SplatTourHandle, VoiceStatus } from '@/lib/types';
import { parseNav, ask } from '@/lib/api';
import { parseCommand } from '@/lib/command';
import { speak } from '@/lib/useSpeech';
import { track } from '@/lib/track';
import { mockListings } from '@/lib/mockListings';
import { getHouseFacts } from '@/lib/houseFacts';
import { popIn, EASE_OUT } from '@/lib/motion';
import TourVoiceBar from './TourVoiceBar';
import HouseInfoPanel from './HouseInfoPanel';
import BookingModal from './BookingModal';
import CallStatusCard from './CallStatusCard';
import VoiceWaveform from './VoiceWaveform';

// Voice phrases that signal an APP ACTION (booking / page nav) rather than 3D
// movement or a question — those fall through to the existing nav -> Q&A flow.
const ACTION_HINT = /\b(book|schedule|set up|arrange|make)\b.{0,20}\b(viewing|tour|appointment|showing|visit)\b|\bbook it\b|\bbook a\b|\bcall (the )?(realtor|agent|them|her|him)\b|\bset up an appointment\b|\bback to (search|finder)\b|\bsearch page\b|\bdashboard\b|\bgo home\b|\bhome ?page\b|\bfind (another|a different|more)\b/i;

// Buyer identity used when booking hands-free by voice (optional, non-secret).
const BUYER_NAME = process.env.NEXT_PUBLIC_DEMO_BUYER_NAME || 'Haven guest';
const BUYER_PHONE = process.env.NEXT_PUBLIC_DEMO_BUYER_PHONE || '+1 (555) 010-0000';

interface TourShellProps {
  tour: TourMeta;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SplatTour?: React.ForwardRefExoticComponent<any>;
}

export default function TourShell({ tour, SplatTour }: TourShellProps) {
  const splatRef = useRef<SplatTourHandle>(null);
  const idxRef = useRef(0); // mirrors SplatTour's waypoint index so the pill stays in sync
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [currentWaypoint, setCurrentWaypoint] = useState(tour.waypoints[0]);
  const [statusMsg, setStatusMsg] = useState('');
  const [showHint, setShowHint] = useState(true); // controls hint, auto-fades
  const [showBooking, setShowBooking] = useState(false);
  const [callInfo, setCallInfo] = useState<{ conversationId: string | null; simulated: boolean; preferredTime: string } | null>(null);
  const [answer, setAnswer] = useState<{ q: string; a: string } | null>(null);
  const answerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [countdown, setCountdown] = useState<{ secs: number; time?: string } | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const router = useRouter();
  const listing = mockListings.find((l) => l.id === tour.listingId);
  const realtor = listing ? getHouseFacts(listing).realtor : { name: 'the listing agent', agency: '', phone: '' };

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 7000);
    track('tour_open', `Opened the tour of ${tour.address}`, { listingId: tour.listingId });
    return () => clearTimeout(t);
  }, [tour.address, tour.listingId]);

  // Voice "book it & call the realtor" → places the booking, which fires the real
  // ElevenLabs/Twilio call. Hands-free, but gated by a cancellable countdown so a
  // mis-heard phrase never silently dials.
  const placeBookingCall = useCallback(async (time?: string) => {
    setVoiceStatus('thinking');
    setStatusMsg(`Calling ${realtor.name}…`);
    try {
      const res = await fetch('/api/appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: tour.listingId,
          address: tour.address,
          name: BUYER_NAME,
          phone: BUYER_PHONE,
          preferredTime: time || 'Flexible',
          realtorName: realtor.name,
          realtorPhone: realtor.phone,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        track('appointment', `Voice-booked a viewing of ${tour.address}`, { listingId: tour.listingId });
        if (data.spoken) speak(data.spoken);
        // Show the live call view (status + transcript stream in).
        setCallInfo({
          conversationId: data.call?.conversationId ?? null,
          simulated: !!data.call?.simulated,
          preferredTime: time || 'Flexible',
        });
      } else {
        setAnswer({ q: 'Book a viewing', a: data.message || 'I could not place the booking.' });
      }
    } catch {
      setAnswer({ q: 'Book a viewing', a: 'Network error placing the booking.' });
    }
    setStatusMsg('');
    setVoiceStatus('idle');
  }, [tour.listingId, tour.address, realtor.name, realtor.phone]);

  const cancelCountdown = useCallback(() => {
    if (countdownTimer.current) { clearInterval(countdownTimer.current); countdownTimer.current = null; }
    setCountdown(null);
    setStatusMsg('');
    setVoiceStatus('idle');
  }, []);

  // Tick a cancellable 3-2-1 countdown, then place the call. Driven by an interval
  // (not a render effect) so we never setState synchronously inside an effect body.
  const startBookingCountdown = useCallback((time?: string) => {
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    let secs = 3;
    setCountdown({ secs, time });
    countdownTimer.current = setInterval(() => {
      secs -= 1;
      if (secs <= 0) {
        if (countdownTimer.current) { clearInterval(countdownTimer.current); countdownTimer.current = null; }
        setCountdown(null);
        void placeBookingCall(time);
      } else {
        setCountdown({ secs, time });
      }
    }, 1000);
  }, [placeBookingCall]);

  // Clear any pending countdown timer on unmount.
  useEffect(() => () => { if (countdownTimer.current) clearInterval(countdownTimer.current); }, []);

  const onTourSpeech = useCallback(async (transcript: string) => {
    setVoiceStatus('thinking');
    setStatusMsg('Thinking…');
    if (answerTimer.current) clearTimeout(answerTimer.current);
    setAnswer(null);

    // Agentic command check first — booking + app navigation. Spatial / info
    // phrases fall through to the existing nav -> Q&A flow below.
    if (ACTION_HINT.test(transcript)) {
      const cmd = await parseCommand(transcript, { page: 'tour', listingId: tour.listingId });
      if (cmd.action === 'book') {
        if (cmd.speech) speak(cmd.speech);
        setStatusMsg(cmd.speech || 'Setting up the viewing…');
        startBookingCountdown(cmd.preferredTime);
        return;
      }
      if (cmd.action === 'go_page' && cmd.page) {
        if (cmd.speech) speak(cmd.speech);
        router.push(cmd.page === 'dashboard' ? '/dashboard' : cmd.page === 'home' ? '/' : '/finder');
        return;
      }
      if (cmd.action === 'open_house' && cmd.houseId) {
        router.push(`/tour/${cmd.houseId}`);
        return;
      }
      // tour_nav / question / none -> fall through to nav + Q&A
    }

    const res = await parseNav(
      transcript,
      tour.waypoints.map((w) => ({ id: w.id, label: w.label }))
    );

    if (res.ok) {
      // It's a navigation command — move the camera.
      splatRef.current?.apply(res.command);
      const c = res.command;
      const last = tour.waypoints.length - 1;
      let movedTo: string | null = null;
      if (c.type === 'goto' && c.waypointId) {
        const i = tour.waypoints.findIndex((w) => w.id === c.waypointId);
        if (i >= 0) { idxRef.current = i; setCurrentWaypoint(tour.waypoints[i]); movedTo = tour.waypoints[i].label; }
      } else if (c.type === 'reset') {
        idxRef.current = 0; setCurrentWaypoint(tour.waypoints[0]); movedTo = tour.waypoints[0].label;
      } else if (c.type === 'next') {
        idxRef.current = Math.min(last, idxRef.current + 1); setCurrentWaypoint(tour.waypoints[idxRef.current]); movedTo = tour.waypoints[idxRef.current].label;
      } else if (c.type === 'prev') {
        idxRef.current = Math.max(0, idxRef.current - 1); setCurrentWaypoint(tour.waypoints[idxRef.current]); movedTo = tour.waypoints[idxRef.current].label;
      }
      // turn / tilt / move / zoom / look: stay on the current waypoint label
      speak(c.speech);
      setStatusMsg(c.speech);
      if (movedTo) track('navigate', `Moved to the ${movedTo} of ${tour.address}`, { listingId: tour.listingId });
      setVoiceStatus('speaking');
      setTimeout(() => { setVoiceStatus('idle'); setStatusMsg(''); }, 3000);
    } else {
      // Not a navigation command — answer it as a question about this home.
      setStatusMsg('Looking that up…');
      const a = await ask(tour.listingId, transcript, currentWaypoint.label);
      setAnswer({ q: transcript, a: a.answer });
      setStatusMsg('');
      speak(a.spoken);
      setVoiceStatus('speaking');
      answerTimer.current = setTimeout(() => setAnswer(null), 16000);
      setTimeout(() => setVoiceStatus('idle'), 3000);
    }
  }, [tour.waypoints, tour.listingId, tour.address, currentWaypoint.label, startBookingCountdown, router]);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-bg">
      {/* Top bar — frosted glass */}
      <header className="glass-strong relative z-20 flex items-center gap-4 border-b border-white/10 px-4 py-3 sm:px-6">
        <Link
          href="/finder"
          className="btn-ghost inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 text-sm"
          aria-label="Back to search"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </Link>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text">{tour.address}</p>
          <p className="truncate text-xs text-textdim">
            <span className="text-accent">●</span> {currentWaypoint.label}
          </p>
        </div>

        {/* Waypoint pills */}
        <nav aria-label="Tour waypoints" className="hidden gap-1.5 md:flex">
          {tour.waypoints.map((wp) => {
            const active = wp.id === currentWaypoint.id;
            return (
              <motion.button
                key={wp.id}
                type="button"
                onClick={() => onTourSpeech(wp.label)}
                aria-pressed={active}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.95 }}
                className={[
                  'min-h-[36px] rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-accent bg-accent/15 text-accent shadow-[0_0_18px_-4px_rgba(34,211,238,0.7)]'
                    : 'border-white/10 bg-white/[0.03] text-textdim hover:border-accent/40 hover:text-text',
                ].join(' ')}
              >
                {wp.label}
              </motion.button>
            );
          })}
        </nav>
      </header>

      {/* 3D viewport */}
      <div className="relative flex-1 overflow-hidden">
        {SplatTour ? (
          <SplatTour
            ref={splatRef}
            tour={tour}
            onReady={(h: SplatTourHandle) => {
              splatRef.current = h;
            }}
          />
        ) : (
          <TourPlaceholder tour={tour} currentWaypoint={currentWaypoint.id} />
        )}

        {/* Siri-style voice visualiser — centre of the viewport while the agent
            thinks/talks (driven by voiceStatus; decorative, aria-hidden). */}
        <VoiceWaveform status={voiceStatus} />

        {/* House info — Apple-glass facts panel, top-right */}
        <HouseInfoPanel
          listingId={tour.listingId}
          currentRoom={currentWaypoint.label}
          onBook={() => setShowBooking(true)}
        />

        {/* Q&A answer card */}
        <AnimatePresence>
          {answer && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.32, ease: EASE_OUT }}
              className="absolute inset-x-3 bottom-28 z-20 mx-auto max-w-xl sm:inset-x-0"
            >
              <div className="glass-strong rounded-2xl border-white/10 p-4">
                <p className="mb-1 text-[11px] uppercase tracking-wider text-textdim">You asked · {currentWaypoint.label}</p>
                <p className="text-xs italic text-textdim">&ldquo;{answer.q}&rdquo;</p>
                <p className="mt-2 text-sm leading-relaxed text-text">{answer.a}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls hint (auto-fades) */}
        <AnimatePresence>
          {showHint && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className="pointer-events-none absolute inset-x-0 bottom-28 z-10 flex justify-center px-4"
            >
              <span className="glass-strong rounded-full px-4 py-2 text-center text-[11px] text-textdim">
                <span className="text-text">Drag</span> to look around ·{' '}
                <span className="text-text">scroll</span> to zoom ·{' '}
                <span className="text-text">double-click</span> to step forward · or use{' '}
                <span className="text-accent">voice</span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status overlay */}
        <div aria-live="polite" className="pointer-events-none absolute left-1/2 top-6 z-10 -translate-x-1/2">
          <AnimatePresence>
            {statusMsg && (
              <motion.div
                variants={popIn}
                initial="hidden"
                animate="show"
                exit="exit"
                className="glass-strong rounded-full px-4 py-2 text-xs font-medium text-accent shadow-[0_0_30px_-8px_rgba(34,211,238,0.6)]"
              >
                {statusMsg}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stop description */}
        <div className="pointer-events-none absolute bottom-32 left-4 right-4 z-10 sm:left-6 sm:right-auto sm:max-w-sm">
          <AnimatePresence mode="wait">
            {currentWaypoint.description && (
              <motion.div
                key={currentWaypoint.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                className="glass rounded-2xl p-4"
              >
                <p className="text-sm font-semibold text-text">{currentWaypoint.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-textdim">{currentWaypoint.description}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Book-and-call countdown (voice action, cancellable) */}
      <AnimatePresence>
        {countdown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={cancelCountdown} />
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-strong relative w-full max-w-sm rounded-2xl border-white/15 p-6 text-center"
            >
              <p className="text-[11px] uppercase tracking-wider text-textdim">Calling on your behalf</p>
              <p className="mt-1 text-lg font-bold text-text">{realtor.name}</p>
              <p className="text-xs text-textdim">
                to book a viewing{countdown.time ? ` · ${countdown.time}` : ''}
              </p>
              <div className="mx-auto my-5 grid h-20 w-20 place-items-center rounded-full border-2 border-accent text-3xl font-bold text-accent shadow-[0_0_44px_-8px_rgba(34,211,238,0.7)]">
                {countdown.secs}
              </div>
              <button
                type="button"
                onClick={cancelCountdown}
                className="btn-ghost min-h-[44px] w-full rounded-xl text-sm font-semibold"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice bar */}
      <TourVoiceBar onSpeech={onTourSpeech} externalStatus={voiceStatus} />

      {/* Book-a-viewing modal */}
      <AnimatePresence>
        {showBooking && (
          <BookingModal
            listingId={tour.listingId}
            address={tour.address}
            realtorName={realtor.name}
            realtorPhone={realtor.phone}
            onClose={() => setShowBooking(false)}
          />
        )}
      </AnimatePresence>

      {/* Live realtor call — appears when a booking is made by voice */}
      <AnimatePresence>
        {callInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCallInfo(null)} />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/15 shadow-2xl"
              style={{ background: 'rgba(20,22,28,0.85)', backdropFilter: 'blur(24px) saturate(150%)' }}
            >
              <CallStatusCard
                conversationId={callInfo.conversationId}
                simulated={callInfo.simulated}
                realtorName={realtor.name}
                buyerPhone={BUYER_PHONE}
                listingId={tour.listingId}
                address={tour.address}
                preferredTime={callInfo.preferredTime}
                onClose={() => setCallInfo(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TourPlaceholder({ tour, currentWaypoint }: { tour: TourMeta; currentWaypoint: string }) {
  const wp = tour.waypoints.find((w) => w.id === currentWaypoint) ?? tour.waypoints[0];
  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden">
      {/* Background gradient orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(34,211,238,0.18), transparent 65%), radial-gradient(ellipse 80% 60% at 30% 80%, rgba(34,211,238,0.05), transparent 70%)',
        }}
      />
      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        <div className="grid h-24 w-24 place-items-center rounded-full border border-accent/40 bg-accent/10 text-accent shadow-[0_0_60px_-10px_rgba(34,211,238,0.7)]">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 21h18M5 21V8l7-5 7 5v13" />
            <path d="M9 21v-6h6v6" />
          </svg>
        </div>
        <div className="max-w-sm px-6">
          <p className="text-2xl font-bold text-text">{wp.label}</p>
          <p className="mt-2 text-sm text-textdim">{wp.description}</p>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-widest text-textdim/60">
            [3D splat mounts here — waiting on Shaurya]
          </p>
        </div>

        <div className="mt-2 flex gap-2">
          {['← Prev', '→ Next'].map((label) => (
            <span
              key={label}
              className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-textdim"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

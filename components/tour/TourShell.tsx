'use client';
import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { TourMeta, SplatTourHandle, VoiceStatus } from '@/lib/types';
import { parseNav } from '@/lib/api';
import { speak } from '@/lib/useSpeech';
import TourVoiceBar from './TourVoiceBar';

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

  const onTourSpeech = useCallback(async (transcript: string) => {
    setVoiceStatus('thinking');
    setStatusMsg('Navigating…');

    const res = await parseNav(
      transcript,
      tour.waypoints.map((w) => ({ id: w.id, label: w.label }))
    );

    if (res.ok) {
      splatRef.current?.apply(res.command);
      const c = res.command;
      const last = tour.waypoints.length - 1;
      if (c.type === 'goto' && c.waypointId) {
        const i = tour.waypoints.findIndex((w) => w.id === c.waypointId);
        if (i >= 0) { idxRef.current = i; setCurrentWaypoint(tour.waypoints[i]); }
      } else if (c.type === 'reset') {
        idxRef.current = 0;
        setCurrentWaypoint(tour.waypoints[0]);
      } else if (c.type === 'next') {
        idxRef.current = Math.min(last, idxRef.current + 1);
        setCurrentWaypoint(tour.waypoints[idxRef.current]);
      } else if (c.type === 'prev') {
        idxRef.current = Math.max(0, idxRef.current - 1);
        setCurrentWaypoint(tour.waypoints[idxRef.current]);
      }
      // turn / tilt / move / zoom / look: stay on the current waypoint label
      speak(c.speech);
      setStatusMsg(c.speech);
    } else {
      const fallback = res.spokenFallback ?? "I didn't catch that.";
      speak(fallback);
      setStatusMsg(fallback);
    }

    setVoiceStatus('speaking');
    setTimeout(() => {
      setVoiceStatus('idle');
      setStatusMsg('');
    }, 3000);
  }, [tour.waypoints]);

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
              <button
                key={wp.id}
                type="button"
                onClick={() => onTourSpeech(wp.label)}
                aria-pressed={active}
                className={[
                  'min-h-[36px] rounded-full border px-3 py-1 text-xs font-medium transition-all',
                  active
                    ? 'border-accent bg-accent/15 text-accent shadow-[0_0_18px_-4px_rgba(34,211,238,0.7)]'
                    : 'border-white/10 bg-white/[0.03] text-textdim hover:border-accent/40 hover:text-text',
                ].join(' ')}
              >
                {wp.label}
              </button>
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

        {/* Status overlay */}
        {statusMsg && (
          <div
            aria-live="polite"
            className="pointer-events-none absolute left-1/2 top-6 z-10 -translate-x-1/2"
          >
            <div className="glass-strong rounded-full px-4 py-2 text-xs font-medium text-accent shadow-[0_0_30px_-8px_rgba(34,211,238,0.6)]">
              {statusMsg}
            </div>
          </div>
        )}

        {/* Stop description */}
        {currentWaypoint.description && (
          <div className="pointer-events-none absolute bottom-32 left-4 right-4 z-10 sm:left-6 sm:right-auto sm:max-w-sm">
            <div className="glass rounded-2xl p-4">
              <p className="text-sm font-semibold text-text">{currentWaypoint.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-textdim">{currentWaypoint.description}</p>
            </div>
          </div>
        )}
      </div>

      {/* Voice bar */}
      <TourVoiceBar onSpeech={onTourSpeech} externalStatus={voiceStatus} />
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

'use client';
import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { TourMeta, SplatTourHandle, VoiceStatus } from '@/lib/types';
import { parseNav } from '@/lib/api';
import { speak } from '@/lib/useSpeech';
import TourVoiceBar from './TourVoiceBar';

interface TourShellProps {
  tour: TourMeta;
  // SplatTour: Shaurya's component — typed but mounted dynamically when ready.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SplatTour?: React.ForwardRefExoticComponent<any>;
}

export default function TourShell({ tour, SplatTour }: TourShellProps) {
  const splatRef = useRef<SplatTourHandle>(null);
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

      // Track current waypoint for display.
      if (res.command.waypointId) {
        const wp = tour.waypoints.find((w) => w.id === res.command.waypointId);
        if (wp) setCurrentWaypoint(wp);
      } else if (res.command.type === 'reset') {
        setCurrentWaypoint(tour.waypoints[0]);
      }

      speak(res.command.speech);
      setStatusMsg(res.command.speech);
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
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-line bg-surface shrink-0">
        <Link
          href="/finder"
          className="flex items-center gap-2 text-sm text-textdim hover:text-text transition-colors"
          aria-label="Back to search results"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </Link>

        <div className="text-center flex-1 px-4">
          <h1 className="text-sm font-semibold text-text truncate">{tour.address}</h1>
          <p className="text-xs text-textdim">{currentWaypoint.label}</p>
        </div>

        {/* Waypoint list pills */}
        <nav aria-label="Tour stops" className="hidden sm:flex items-center gap-1.5">
          {tour.waypoints.map((wp) => (
            <button
              key={wp.id}
              onClick={() => onTourSpeech(wp.label)}
              aria-pressed={wp.id === currentWaypoint.id}
              className={[
                'text-xs px-2.5 py-1 rounded-full border transition-colors',
                wp.id === currentWaypoint.id
                  ? 'bg-accent/15 text-accent border-accent/40'
                  : 'bg-surface2 text-textdim border-line hover:border-accent/30',
              ].join(' ')}
            >
              {wp.label}
            </button>
          ))}
        </nav>
      </header>

      {/* 3D viewport — Shaurya's SplatTour mounts here */}
      <section
        className="flex-1 relative bg-black"
        aria-label="3D home tour viewport"
        style={{ minHeight: 'calc(100vh - 180px)' }}
      >
        {SplatTour ? (
          <SplatTour ref={splatRef} tour={tour} />
        ) : (
          /* Placeholder until Shaurya's component is ready */
          <TourPlaceholder tour={tour} currentWaypoint={currentWaypoint.id} />
        )}

        {/* Overlay: status message */}
        {statusMsg && (
          <div
            aria-live="polite"
            aria-atomic="true"
            role="status"
            className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-bg/80 backdrop-blur text-sm text-text border border-line"
          >
            {statusMsg}
          </div>
        )}

        {/* Current stop description */}
        {currentWaypoint.description && (
          <div className="absolute bottom-24 left-4 right-4 sm:left-8 sm:right-auto sm:max-w-xs px-4 py-3 rounded-lg bg-bg/80 backdrop-blur border border-line">
            <p className="text-xs font-semibold text-accent mb-0.5">{currentWaypoint.label}</p>
            <p className="text-sm text-textdim">{currentWaypoint.description}</p>
          </div>
        )}
      </section>

      {/* Voice bar — fixed bottom */}
      <TourVoiceBar onSpeech={onTourSpeech} externalStatus={voiceStatus} />
    </div>
  );
}

// --- Placeholder until Shaurya's Gaussian splat component is handed over ---
function TourPlaceholder({ tour, currentWaypoint }: { tour: TourMeta; currentWaypoint: string }) {
  const wp = tour.waypoints.find((w) => w.id === currentWaypoint) ?? tour.waypoints[0];
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center px-8">
      <div className="w-24 h-24 rounded-full bg-surface2 border border-line flex items-center justify-center">
        <svg className="w-10 h-10 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>
      <div>
        <p className="text-accent font-semibold">{wp.label}</p>
        <p className="text-sm text-textdim mt-1 max-w-xs">{wp.description}</p>
        <p className="text-xs text-line mt-4">[3D splat mounts here — waiting on Shaurya]</p>
      </div>

      {/* Keyboard nav hint */}
      <div className="flex gap-3 mt-2" role="group" aria-label="Keyboard navigation">
        {['← Prev', '→ Next'].map((label) => (
          <span key={label} className="text-xs px-3 py-1.5 rounded border border-line text-textdim">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

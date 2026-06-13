'use client';
import Link from 'next/link';
import type { Listing, AccessibilityFeature } from '@/lib/types';

interface ListingCardProps {
  listing: Listing;
  rank: number;
}

const accessibilityLabels: Record<AccessibilityFeature, string> = {
  wheelchair: 'Wheelchair',
  elevator: 'Elevator',
  'ground-floor': 'Ground Floor',
  'wide-doors': 'Wide Doors',
  'grab-bars': 'Grab Bars',
  'hearing-loop': 'Hearing Loop',
  'braille-signage': 'Braille',
};

/** Circular score ring: gradient arc, color tier by score. */
function ScoreRing({ score }: { score: number }) {
  const tier =
    score >= 85 ? { stroke: '#4ADE80', text: 'text-good', label: 'Strong match' } :
    score >= 70 ? { stroke: '#FBBF24', text: 'text-warn', label: 'Good match' } :
                  { stroke: '#A1A1AA', text: 'text-textdim', label: 'Partial match' };

  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, score)) / 100);

  return (
    <div
      className={`relative grid h-14 w-14 shrink-0 place-items-center ring-shimmer ${tier.text}`}
      aria-label={`${score}% match — ${tier.label}`}
      title={`${score}% match`}
    >
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden>
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <circle
          cx="28" cy="28" r={r}
          fill="none"
          stroke={tier.stroke}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 28 28)"
          style={{ filter: `drop-shadow(0 0 6px ${tier.stroke})` }}
        />
      </svg>
      <span className="absolute text-[11px] font-bold tabular-nums">{score}</span>
    </div>
  );
}

function PillGlow({ label }: { label: string }) {
  return (
    <span className="pill-glow inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium">
      {label}
    </span>
  );
}

function ProgramBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-textdim">
      {label}
    </span>
  );
}

export default function ListingCard({ listing, rank }: ListingCardProps) {
  const {
    id, address, city, state, rent, beds, baths, sqft,
    accessibility, programs, matchScore, hasTour, tourId,
    description, available,
  } = listing;

  return (
    <article
      className={[
        'glass glass-hover relative rounded-2xl p-5 sm:p-6',
        !available && 'opacity-60',
      ].filter(Boolean).join(' ')}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-textdim">
              #{rank}
            </span>
            {!available && (
              <span className="rounded-md bg-bad/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-bad">
                Unavailable
              </span>
            )}
          </div>
          <h3 className="truncate text-lg font-semibold text-text">{address}</h3>
          <p className="text-sm text-textdim">{city}, {state}</p>
        </div>
        <ScoreRing score={matchScore} />
      </div>

      {/* Stats row */}
      <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <span className="text-xl font-bold text-text">
          ${rent.toLocaleString()}
          <span className="ml-1 text-xs font-normal text-textdim">/mo</span>
        </span>
        <span className="text-textdim">{beds} bd</span>
        <span className="text-textdim">{baths} ba</span>
        <span className="text-textdim">{sqft.toLocaleString()} ft²</span>
      </div>

      {/* Description */}
      <p className="mt-3 text-sm leading-relaxed text-textdim">{description}</p>

      {/* Accessibility */}
      {accessibility.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {accessibility.map((f) => (
            <PillGlow key={f} label={accessibilityLabels[f]} />
          ))}
        </div>
      )}

      {/* Programs */}
      {programs.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {programs.map((p) => (
            <ProgramBadge key={p} label={p} />
          ))}
        </div>
      )}

      {/* CTA */}
      {hasTour && tourId && (
        <Link
          href={`/tour/${tourId}`}
          className="btn-neon mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-semibold"
          aria-label={`Walk through ${address} in 3D`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 21h18M5 21V8l7-5 7 5v13" />
            <path d="M9 21v-6h6v6" />
          </svg>
          Walk this home
        </Link>
      )}
    </article>
  );
}

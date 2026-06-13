'use client';
import Link from 'next/link';
import type { Listing, AccessibilityFeature } from '@/lib/types';

interface ListingCardProps {
  listing: Listing;
  rank: number; // 1-based position in results
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

function ScoreChip({ score }: { score: number }) {
  const color =
    score >= 85 ? 'text-good bg-good/10 border-good/30' :
    score >= 70 ? 'text-warn bg-warn/10 border-warn/30' :
                  'text-textdim bg-surface2 border-line';
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      {score}% match
    </span>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
      {label}
    </span>
  );
}

function ProgramBadge({ label }: { label: string }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-surface2 text-textdim border border-line">
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
      aria-label={`Listing ${rank}: ${address}`}
      className={[
        'rounded-xl border p-5 flex flex-col gap-3 transition-colors',
        'bg-surface border-line hover:border-accent/40',
        !available ? 'opacity-60' : '',
      ].join(' ')}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-textdim mb-0.5">#{rank}</p>
          <h3 className="text-text font-semibold leading-snug">{address}</h3>
          <p className="text-textdim text-sm">{city}, {state}</p>
        </div>
        <ScoreChip score={matchScore} />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-textdim">
        <span className="text-text font-bold text-lg">${rent.toLocaleString()}<span className="text-xs font-normal text-textdim">/mo</span></span>
        <span>{beds} bd</span>
        <span>{baths} ba</span>
        <span>{sqft.toLocaleString()} ft²</span>
        {!available && <span className="text-bad text-xs font-medium">Unavailable</span>}
      </div>

      {/* Description */}
      <p className="text-sm text-textdim leading-relaxed">{description}</p>

      {/* Accessibility badges */}
      {accessibility.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Accessibility features">
          {accessibility.map((f) => (
            <Badge key={f} label={accessibilityLabels[f]} />
          ))}
        </div>
      )}

      {/* Program badges */}
      {programs.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Housing programs">
          {programs.map((p) => (
            <ProgramBadge key={p} label={p} />
          ))}
        </div>
      )}

      {/* CTA */}
      {hasTour && tourId && (
        <Link
          href={`/tour/${tourId}`}
          className={[
            'mt-1 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold',
            'bg-accent text-bg hover:bg-accent/90 transition-colors',
            'min-h-[48px] justify-center',
          ].join(' ')}
          aria-label={`Walk through ${address} in 3D`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Walk this home
        </Link>
      )}
    </article>
  );
}

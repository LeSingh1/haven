'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
  const r = 20;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <div
      className={`relative grid h-12 w-12 shrink-0 place-items-center ${tier.text}`}
      aria-label={`${score} percent match — ${tier.label}`}
      title={`${score}% match`}
    >
      <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden>
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="4" />
        <circle
          cx="24" cy="24" r={r} fill="none" stroke={tier.stroke} strokeWidth="4"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 24 24)" style={{ filter: `drop-shadow(0 0 5px ${tier.stroke})` }}
        />
      </svg>
      <span className="absolute text-[11px] font-bold tabular-nums">{score}</span>
    </div>
  );
}

/** Decorative "home" cover — gradient + faint architectural lines (we have no
 *  photo, so this evokes the dwelling and foregrounds the 3D-tour affordance). */
function MediaCover({ available }: { available: boolean }) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(155deg, #15171b 0%, #0e1013 55%, #0a0c0f 100%)',
        }}
        variants={{ rest: { scale: 1 }, hover: { scale: 1.06 } }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* cyan wash */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 80% at 30% 10%, rgba(34,211,238,0.16), transparent 60%)' }}
        />
        {/* architectural line pattern */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.18]" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice">
          <g stroke="#22D3EE" strokeWidth="1.2" fill="none">
            <path d="M40 200 V90 L120 40 L200 90 V200" />
            <path d="M120 200 V120 H160 V200" />
            <path d="M75 110 H105 V140 H75 Z M135 110 H165 V140 H135 Z" />
            <path d="M230 200 V110 L300 70 L370 110 V200" />
            <path d="M260 130 H290 V165 H260 Z" />
          </g>
        </svg>
      </motion.div>
      {!available && <div className="absolute inset-0 bg-bg/40" />}
    </div>
  );
}

export default function ListingCard({ listing, rank }: ListingCardProps) {
  const {
    address, city, state, rent, beds, baths, sqft,
    accessibility, programs, matchScore, hasTour, tourId, description, available,
  } = listing;

  const bedLabel = beds === 0 ? 'Studio' : `${beds} bd`;
  const href = hasTour && tourId ? `/tour/${tourId}` : undefined;

  const inner = (
    <motion.article
      initial="rest"
      animate="rest"
      whileHover="hover"
      className={[
        'group glass relative flex h-full flex-col overflow-hidden rounded-2xl',
        'transition-[border-color,box-shadow] duration-200',
        'hover:border-accent/45 hover:shadow-[0_0_0_1px_rgba(34,211,238,0.22),0_18px_50px_-18px_rgba(34,211,238,0.4)]',
        href ? 'cursor-pointer' : '',
        !available ? 'opacity-70' : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Media cover */}
      <div className="relative h-40 w-full">
        <MediaCover available={available} />

        {/* top row: rank + tour badge / score */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-textdim backdrop-blur-sm">
              #{rank}
            </span>
            {hasTour && (
              <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-accent backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_2px_rgba(34,211,238,0.7)]" />
                3D Tour
              </span>
            )}
            {!available && (
              <span className="rounded-md bg-bad/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-bad backdrop-blur-sm">
                Unavailable
              </span>
            )}
          </div>
          <ScoreRing score={matchScore} />
        </div>

        {/* hover affordance */}
        {href && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center pb-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-[#04161A] shadow-[0_8px_30px_-8px_rgba(34,211,238,0.7)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 21h18M5 21V8l7-5 7 5v13" /><path d="M9 21v-6h6v6" />
              </svg>
              Walk through in 3D
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-2xl font-bold tracking-tight text-text">
            ${rent.toLocaleString()}
            <span className="ml-1 text-xs font-normal text-textdim">/mo</span>
          </span>
          <span className="text-sm tabular-nums text-textdim">
            {bedLabel} · {baths} ba · {sqft.toLocaleString()} ft²
          </span>
        </div>

        <h3 className="mt-1.5 truncate text-base font-semibold text-text">{address}</h3>
        <p className="text-sm text-textdim">{city}, {state}</p>

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-textdim">{description}</p>

        {/* Accessibility */}
        {accessibility.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {accessibility.map((f) => (
              <span key={f} className="pill-glow inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium">
                {accessibilityLabels[f]}
              </span>
            ))}
          </div>
        )}

        {/* Programs */}
        {programs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {programs.map((p) => (
              <span key={p} className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-textdim">
                {p}
              </span>
            ))}
          </div>
        )}

        {/* CTA hint pinned to bottom */}
        {href && (
          <div className="mt-auto flex items-center gap-1.5 pt-5 text-sm font-semibold text-accent">
            Walk this home
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </div>
        )}
      </div>
    </motion.article>
  );

  // The whole card is the link (Zillow-style), with a descriptive label.
  return href ? (
    <Link href={href} aria-label={`Walk through ${address}, ${city} in 3D — $${rent.toLocaleString()} per month, ${bedLabel}`} className="block h-full focus-visible:outline-none">
      {inner}
    </Link>
  ) : (
    inner
  );
}

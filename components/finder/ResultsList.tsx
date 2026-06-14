'use client';
import { motion } from 'framer-motion';
import type { Listing } from '@/lib/types';
import ListingCard from './ListingCard';
import AnimatedNumber from '@/components/AnimatedNumber';
import { staggerContainer, cardIn } from '@/lib/motion';

interface ResultsListProps {
  listings: Listing[];
  totalCount: number;
  loading: boolean;
}

export default function ResultsList({ listings, totalCount, loading }: ResultsListProps) {
  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Searching for listings"
        className="grid grid-cols-1 gap-5 sm:grid-cols-2"
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="glass overflow-hidden rounded-2xl">
            <div className="h-40 w-full animate-pulse bg-white/[0.04]" />
            <div className="space-y-3 p-5">
              <div className="h-6 w-1/2 animate-pulse rounded bg-white/[0.05]" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-white/[0.04]" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.04]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (listings.length === 0) return null;

  const shown = listings.slice(0, 10);
  const hiddenCount = totalCount - shown.length;

  return (
    <section aria-label={`Search results — ${totalCount} listing${totalCount !== 1 ? 's' : ''} found`}>
      <div aria-live="polite" aria-atomic="false" className="sr-only">
        {totalCount} result{totalCount !== 1 ? 's' : ''} found
      </div>

      <p className="mb-4 text-sm text-textdim">
        <AnimatedNumber value={totalCount} className="font-semibold text-text" /> result{totalCount !== 1 ? 's' : ''} found
        {hiddenCount > 0 && ` — showing top ${shown.length}`}
      </p>

      {/* key = first id so the grid re-runs its stagger on each new search */}
      <motion.ul
        key={shown[0]?.id ?? 'empty'}
        variants={staggerContainer(0.07)}
        initial="hidden"
        animate="show"
        className="grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2"
      >
        {shown.map((l, i) => (
          <motion.li key={l.id} variants={cardIn} className="h-full">
            <ListingCard listing={l} rank={i + 1} />
          </motion.li>
        ))}
      </motion.ul>

      {hiddenCount > 0 && (
        <p className="mt-5 text-center text-sm text-textdim">
          Say &ldquo;show more&rdquo; or scroll to see {hiddenCount} additional result{hiddenCount !== 1 ? 's' : ''}.
        </p>
      )}
    </section>
  );
}

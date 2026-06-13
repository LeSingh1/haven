'use client';
import type { Listing } from '@/lib/types';
import ListingCard from './ListingCard';

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
        className="flex flex-col gap-4 w-full max-w-xl mx-auto"
      >
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-xl bg-surface border border-line animate-pulse" />
        ))}
      </div>
    );
  }

  if (listings.length === 0) return null;

  const shown = listings.slice(0, 10);
  const hiddenCount = totalCount - shown.length;

  return (
    <section aria-label={`Search results — ${totalCount} listing${totalCount !== 1 ? 's' : ''} found`}>
      <div
        aria-live="polite"
        aria-atomic="false"
        className="sr-only"
      >
        {totalCount} result{totalCount !== 1 ? 's' : ''} found
      </div>

      <p className="text-sm text-textdim mb-4">
        {totalCount} result{totalCount !== 1 ? 's' : ''} found
        {hiddenCount > 0 && ` — showing top ${shown.length}`}
      </p>

      <ul className="flex flex-col gap-4 list-none p-0">
        {shown.map((l, i) => (
          <li key={l.id}>
            <ListingCard listing={l} rank={i + 1} />
          </li>
        ))}
      </ul>

      {hiddenCount > 0 && (
        <p className="mt-4 text-sm text-textdim text-center">
          Say "show more" or scroll to see {hiddenCount} additional result{hiddenCount !== 1 ? 's' : ''}.
        </p>
      )}
    </section>
  );
}

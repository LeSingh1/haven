import type { Metadata } from 'next';
import Link from 'next/link';
import FinderShell from '@/components/finder/FinderShell';

export const metadata: Metadata = {
  title: 'Haven — Find a Home',
  description: 'Search for affordable, accessible housing by voice or text.',
};

export default function FinderPage() {
  return (
    <div className="relative">
      {/* Home link — same logo as the landing, so the finder isn't a dead end. */}
      <Link
        href="/"
        aria-label="Back to Haven home"
        className="absolute left-6 top-6 z-30 flex items-center gap-2 text-sm font-bold tracking-tight text-text transition-opacity hover:opacity-80 sm:left-10"
      >
        <span className="grid h-7 w-7 place-items-center rounded-lg border border-accent/40 bg-accent/10 text-accent shadow-[0_0_18px_-6px_rgba(34,211,238,0.7)]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 21h18M5 21V9l7-5 7 5v12" />
            <path d="M9 21v-6h6v6" />
          </svg>
        </span>
        Haven
      </Link>
      <FinderShell />
    </div>
  );
}

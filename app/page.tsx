import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Haven — Find AND tour an affordable home using only your voice',
  description:
    'Voice-first, accessibility-forward affordable housing search. Built for the Housing Dignity track at Milpitas Hacks 3.',
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg text-text flex flex-col items-center justify-center px-4 py-16 gap-12">
      {/* Hero */}
      <section className="text-center max-w-2xl" aria-labelledby="hero-heading">
        <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-4">
          Housing Dignity · Milpitas Hacks 3
        </p>
        <h1
          id="hero-heading"
          className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight"
        >
          Find <span className="text-accent">AND</span> tour<br />
          an affordable home<br />
          <span className="text-accent">using only your voice.</span>
        </h1>
        <p className="mt-6 text-textdim text-lg leading-relaxed max-w-xl mx-auto">
          Haven makes affordable housing accessible to everyone — including people with
          mobility, vision, or hearing differences. Search by speaking, then walk through
          your future home in 3D without leaving your chair.
        </p>
      </section>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <Link
          href="/finder"
          className="px-8 py-4 rounded-xl bg-accent text-bg font-bold text-lg hover:bg-accent/90 transition-colors min-h-[56px] flex items-center gap-3"
          aria-label="Start searching for homes — opens the voice finder"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="9" y="2" width="6" height="11" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0M12 19v3M8 22h8" />
          </svg>
          Start searching
        </Link>
        <Link
          href="/finder"
          className="px-8 py-4 rounded-xl border border-line text-textdim font-semibold text-base hover:border-accent/40 hover:text-text transition-colors min-h-[56px] flex items-center"
        >
          Browse listings
        </Link>
      </div>

      {/* Feature pills */}
      <ul
        aria-label="Key features"
        className="flex flex-wrap justify-center gap-3 max-w-xl list-none p-0 m-0"
      >
        {[
          'Voice search & navigation',
          'WCAG-AA accessible',
          '3D Gaussian splat tours',
          'Full keyboard operability',
          'Section 8 · HUD · LIHTC',
        ].map((label) => (
          <li
            key={label}
            className="px-4 py-2 rounded-full bg-surface border border-line text-sm text-textdim"
          >
            {label}
          </li>
        ))}
      </ul>

      {/* Footer note */}
      <footer className="text-xs text-textdim text-center">
        <p>Chrome + HTTPS required for voice features. Keyboard + text fallbacks always available.</p>
      </footer>
    </main>
  );
}

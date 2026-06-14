'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { staggerContainer, fadeUp, fadeUpSm } from '@/lib/motion';

const FEATURE_PILLS = [
  'Voice search & navigation',
  'WCAG-AA accessible',
  '3D Gaussian splat tours',
  'Full keyboard operability',
  'Section 8 · HUD · LIHTC',
];

// Static particle positions (deterministic — no hydration mismatch)
const PARTICLES = [
  { top: '12%', left: '8%', delay: '0s' },
  { top: '22%', left: '88%', delay: '1.2s' },
  { top: '38%', left: '18%', delay: '2.4s' },
  { top: '55%', left: '78%', delay: '0.6s' },
  { top: '70%', left: '32%', delay: '3.1s' },
  { top: '82%', left: '62%', delay: '1.8s' },
  { top: '15%', left: '54%', delay: '2.0s' },
  { top: '46%', left: '92%', delay: '0.3s' },
];

export default function LandingHero() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      {/* Top nav */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2 text-sm font-bold tracking-tight text-text">
          <span className="grid h-7 w-7 place-items-center rounded-lg border border-accent/40 bg-accent/10 text-accent shadow-[0_0_18px_-6px_rgba(34,211,238,0.7)]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 21h18M5 21V9l7-5 7 5v12" /><path d="M9 21v-6h6v6" /></svg>
          </span>
          Haven
        </Link>
        <nav className="flex items-center gap-1.5">
          <Link href="/finder" className="btn-ghost inline-flex min-h-[38px] items-center rounded-lg px-3.5 text-xs font-semibold">
            Search
          </Link>
          <Link href="/calls" className="btn-ghost inline-flex min-h-[38px] items-center rounded-lg px-3.5 text-xs font-semibold">
            Calls
          </Link>
          <Link href="/dashboard" className="btn-ghost inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_2px_rgba(34,211,238,0.7)]" />
            Dashboard
          </Link>
        </nav>
      </header>

      {/* Decorative particles */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {PARTICLES.map((p, i) => (
          <span key={i} className="particle" style={{ top: p.top, left: p.left, animationDelay: p.delay }} />
        ))}
      </div>

      <motion.section
        variants={staggerContainer(0.1, 0.05)}
        initial="hidden"
        animate="show"
        className="relative mx-auto flex max-w-5xl flex-col items-center px-6 pt-28 pb-16 text-center sm:pt-36"
      >
        {/* Eyebrow */}
        <motion.div variants={fadeUpSm} className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium tracking-wide text-textdim backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_2px_rgba(34,211,238,0.7)]" />
            Housing Dignity · Milpitas Hacks 3
          </span>
        </motion.div>

        {/* Hero headline */}
        <motion.h1
          variants={fadeUp}
          className="max-w-4xl text-balance text-5xl font-bold leading-[1.05] tracking-tight text-text sm:text-6xl md:text-7xl"
        >
          Find <span className="accent-shine">AND</span> tour
          <br />
          an affordable home
          <br />
          <span className="text-textdim">using only your </span>
          <span className="accent-shine">voice.</span>
        </motion.h1>

        {/* Subhead */}
        <motion.p
          variants={fadeUp}
          className="mt-8 max-w-2xl text-balance text-base leading-relaxed text-textdim sm:text-lg"
        >
          Haven makes affordable housing accessible to everyone — including people with
          mobility, vision, or hearing differences. Search by speaking, then walk through
          your future home in 3D without leaving your chair.
        </motion.p>

        {/* CTAs */}
        <motion.div variants={fadeUp} className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <motion.div whileHover={{ y: -2 }} whileTap={{ y: 1 }}>
            <Link
              href="/finder"
              className="btn-neon inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-7 text-sm font-semibold"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
              Start searching
            </Link>
          </motion.div>
          <Link
            href="/tour/lst-001"
            className="btn-ghost inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-7 text-sm font-semibold"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 21h18M5 21V9l7-5 7 5v12" /><path d="M9 21v-6h6v6" /></svg>
            Take a 3D tour
          </Link>
        </motion.div>

        {/* Feature pills */}
        <motion.ul variants={fadeUp} className="mt-14 flex flex-wrap justify-center gap-2">
          {FEATURE_PILLS.map((label) => (
            <li
              key={label}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-textdim backdrop-blur-md transition-colors hover:border-accent/40 hover:text-text"
            >
              {label}
            </li>
          ))}
        </motion.ul>

        {/* Footer note */}
        <motion.p variants={fadeUpSm} className="mt-16 max-w-md text-xs leading-relaxed text-textdim/70">
          Chrome + HTTPS required for voice features. Keyboard + text fallbacks always available.
          {' '}
          <Link href="/dashboard" className="text-accent/80 underline-offset-2 hover:underline">
            View live activity →
          </Link>
        </motion.p>
      </motion.section>
    </main>
  );
}

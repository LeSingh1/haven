# Haven

**Find AND tour an affordable, accessible home using only your voice.**
Milpitas Hacks 3 — Track 2: Housing Dignity (accessibility-first).

Two parts:
1. **Voice housing finder** — speak your needs → Claude parses them → matching affordable / accessible listings, read back aloud.
2. **Walkable voice tour** — a pre-captured 3D Gaussian splat of a home, rendered in-browser, walkable with arrow keys and navigable by voice ("take me to the kitchen", "turn around").

## Build docs
- **[docs/BUILD.md](docs/BUILD.md)** — shared spec: frozen `lib/types.ts` contract, risk-first timeline, demo script, cut-ladder, rubric map.
- **[docs/PROMPT-shaurya-backend.md](docs/PROMPT-shaurya-backend.md)** — backend · 3D splat · AI kickoff prompt.
- **[docs/PROMPT-shivam-frontend.md](docs/PROMPT-shivam-frontend.md)** — frontend · voice · accessibility kickoff prompt.

## Stack
Next.js (App Router) + TypeScript + Tailwind · **Spark** (`@sparkjsdev/spark`) on `three@0.180.0` · Claude `claude-opus-4-8` (structured outputs) · Web Speech API · deploy on Vercel.

## Team
- **Shaurya** — backend, Claude AI, 3D splat tour.
- **Shivam** — frontend UI, voice input/output, accessibility.

> The Next.js app is scaffolded into this repo at the start of the build. Until then, the repo holds the build plan in `docs/`.

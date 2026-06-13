# HAVEN — Build Spec (voice finder + walkable splat tour)

> **"Find AND tour an affordable home using only your voice."**
> Milpitas Hacks 3 — Track 2: Housing Dignity (accessibility-first).
> Team of 2 · ~9–10 hours. **This supersedes the older `DOCUMENTATION.md` (the "tell your story once" resource-navigator concept). We pivoted.**

This is the shared spec. Each person also has a detailed kickoff prompt:
- **Shaurya (backend + 3D + AI):** [PROMPT-shaurya-backend.md](PROMPT-shaurya-backend.md)
- **Shivam (frontend + voice + a11y):** [PROMPT-shivam-frontend.md](PROMPT-shivam-frontend.md)

---

## What we're building
**Part 1 — Voice Housing Finder (the floor; build first, must work):** speak your needs → Claude parses them → matching **affordable / accessible** listings rank in → read back aloud.

**Part 2 — Walkable Voice Tour (the hero; the wow):** a **pre-captured 3D Gaussian splat** of a real home, rendered in-browser, **walkable with arrow keys** and **navigable by voice** ("take me to the kitchen," "turn around," "go forward").

The whole point — and the Track-2 thesis — is **accessibility**: someone who is blind, low-mobility, or can't drive to ten viewings can find *and* explore a home hands-free.

---

## 🔴 The two rules that decide whether this works (from the adversarial review)

1. **Capture & process the splat 2–3 DAYS before the hackathon — never day-of.** Luma cloud processing is tens of minutes per attempt and *fails* on glass/mirrors/blank walls. Capture the same home 2–3 times (slow, lights on, avoid mirrors), freeze the first clean one, **commit it to `public/splats/` as a build artifact.** Day-of generation is NOT feasible in 10 hours.
2. **Part 1 is the floor, Part 2 is the ceiling.** Build the voice finder first and get it fully working — it satisfies the track on its own. The splat is upside, not foundation. **If the splat can't be made reliable, a flawless finder still wins; a broken splat must never sink a working finder.**

---

## Tech stack (verified current, June 2026)

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | API routes keep keys server-side |
| Splat renderer | **`@sparkjsdev/spark@2.1.0` on raw Three.js** (`three@0.180.0`, **pinned**) | Spark is the 2026 pick: plain WebGL2, **no COOP/COEP headers** (which fight Vercel), auto-detects `.ply/.spz/.splat`. **Do NOT use @mkkellogg/gaussian-splats-3d or react-three-fiber for the splat** — documented R3F crash + SharedArrayBuffer/header pain. |
| Splat capture | **Luma AI** (phone video → train → export `.ply` from the **web** app) → convert to **`.spz`** (~10× smaller) via spz-js / SuperSplat | `.spz` loads in ~1–2s vs ~100MB `.ply` |
| Voice in/out | **Web Speech API** (`SpeechRecognition` + `speechSynthesis`, browser-native) | No package. Chrome only, HTTPS only. |
| NL parsing | **Claude `claude-opus-4-8`** via `@anthropic-ai/sdk`, server routes, **`client.messages.parse()` + `zodOutputFormat`** (structured outputs, GA — no beta header) | Guaranteed schema-valid JSON, no parse-failure handling |
| Housing data | **Seeded `lib/listings.ts`** (12–20 real Fremont/Milpitas affordable + ADA units) as the demo-safe spine; **HUD FMR API** optional credibility badge | **Do NOT live-scrape Zillow with browser-use** — Cloudflare will fail on stage |
| State / UI | React + Tailwind (+ framer-motion for calm transitions) | — |
| Deploy | **Vercel** (HTTPS is required for the mic) | open-source public repo = rubric points |

### Install
```bash
npx create-next-app@latest haven --typescript --tailwind --app --eslint
cd haven
npm install three@0.180.0 @sparkjsdev/spark@2.1.0        # pin three to match Spark
npm install @anthropic-ai/sdk zod
# .env.local (server-only — NEVER NEXT_PUBLIC):
#   ANTHROPIC_API_KEY=sk-ant-...
#   HUD_API_TOKEN=...        (optional, free from huduser.gov)
```

---

## THE FROZEN CONTRACT — `lib/types.ts`
Owned by **Shaurya**. Shivam imports, never edits. Both halves develop in parallel against this. Note: `Waypoint` stores `position` + `quaternion` (the foolproof authoring method — fly the camera there, log both, hardcode).

```ts
// lib/types.ts  — HAVEN shared contract. OWNED BY SHAURYA; Shivam reads/imports only.

// ── Part 1: listings ──
export type AccessibilityFeature =
  | "wheelchair_accessible" | "step_free_entry" | "elevator" | "grab_bars"
  | "roll_in_shower" | "ground_floor" | "wide_doorways" | "visual_alarms" | "service_animal_ok";

export type AffordabilityProgram =
  | "section_8" | "lihtc" | "below_market_rate" | "senior_restricted" | "veteran_priority" | "no_program";

export interface Listing {
  id: string; title: string; addressLine: string; city: string; state: string; zip: string;
  lat: number; lng: number; rentMonthlyUsd: number; bedrooms: number; bathrooms: number;
  sqft: number | null; petsAllowed: boolean;
  programs: AffordabilityProgram[]; accessibility: AccessibilityFeature[];
  amiCapPct: number | null; availableDate: string; blurb: string;
  hasTour: boolean; tourId: string | null;
  distanceMiles?: number; matchScore?: number; matchReasons?: string[];
}

export interface SearchQuery {
  city?: string; maxRentUsd?: number; minBedrooms?: number; maxBedrooms?: number;
  petsRequired?: boolean; requiredAccessibility?: AccessibilityFeature[];
  requiredPrograms?: AffordabilityProgram[]; seniorOnly?: boolean; veteranPriority?: boolean;
  rawNotes?: string; sourceTranscript: string;
}

// ── Part 2: tour + navigation ──
export interface Waypoint {
  id: string; label: string; aliases: string[];
  position: [number, number, number];        // camera position in splat space
  quaternion: [number, number, number, number]; // camera orientation (x,y,z,w)
}
export interface TourMeta {
  id: string; listingId: string; splatUrl: string;       // "/splats/sunrise.spz"
  spawn: { position: [number, number, number]; quaternion: [number, number, number, number] };
  waypoints: Waypoint[];
  bounds: { min: [number, number, number]; max: [number, number, number] };
  intro: string;
}
export type NavCommand =
  | { kind: "goto"; waypointId: string; speech: string }
  | { kind: "move"; direction: "forward" | "back" | "left" | "right"; meters: number; speech: string }
  | { kind: "turn"; degrees: number; speech: string }   // + = left/CCW, - = right
  | { kind: "look"; target: "around" | "up" | "down"; speech: string }
  | { kind: "describe"; speech: string }
  | { kind: "stop"; speech: string }
  | { kind: "unknown"; speech: string };

/** Imperative handle Shaurya's <SplatTour> exposes; Shivam's voice bar calls apply(). */
export interface SplatTourHandle { apply(cmd: NavCommand): void; }

// ── API envelopes (HTTP 200 always; ok:false carries a speakable fallback) ──
export interface SearchRequest { transcript: string; }
export interface SearchResponse { ok: true; query: SearchQuery; results: Listing[]; spokenSummary: string; }
export interface NavParseRequest { transcript: string; availableWaypoints: { id: string; label: string }[]; }
export interface NavParseResponse { ok: true; command: NavCommand; }
export interface ApiError { ok: false; error: string; spokenFallback: string; }
export type SearchResult = SearchResponse | ApiError;
export type NavParseResult = NavParseResponse | ApiError;

export type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "error";
```

### Endpoints (Shaurya builds, Shivam calls via `lib/api.ts`)
- `POST /api/search` → `{ transcript }` → `SearchResponse` (Claude extracts `SearchQuery`, pure-TS scoring ranks `lib/listings.ts`).
- `POST /api/nav` → `{ transcript, availableWaypoints }` → `NavParseResponse` (Claude → `NavCommand`, constrained to the live waypoints so it can't invent a room).
- `GET /api/health` → `{ ok, claude: "reachable" }` (used at the first integration checkpoint).

---

## File ownership (so two people never touch the same file)
**Shaurya:** `app/api/**`, `lib/claude.ts`, `lib/listings.ts`, `lib/scoring.ts`, `lib/tourData.ts`, `lib/prompts.ts`, `components/tour/SplatTour.tsx` (+ camera/nav internals), `public/splats/`.
**Shivam:** `app/page.tsx`, `app/finder/page.tsx`, `app/tour/[tourId]/page.tsx`, `app/layout.tsx`, `app/globals.css`, `components/finder/**`, `components/tour/TourShell.tsx`, `components/tour/TourVoiceBar.tsx`, `components/ui/**`, `lib/useVoiceInput.ts`, `lib/useSpeech.ts`, `lib/mockListings.ts`, `lib/mockTour.ts`.
**Shared (Shaurya owns, Shivam imports):** `lib/types.ts`, `lib/api.ts`, `package.json`, config.

---

## Risk-first timeline (~9.5h) with checkpoints

| Window | Shaurya | Shivam | Checkpoint |
|---|---|---|---|
| **Pre-event** | **Capture + process the splat** (Luma → `.ply` → `.spz`), commit to `public/splats/`. Capture a backup. | — | splat is a committed artifact |
| **0:00–0:45** | Scaffold, commit `types.ts` + `api.ts`, push, add Shivam | Pull, boot, read `types.ts`, stub `mockListings.ts` + `mockTour.ts` | **CP0:** both `npm run dev` clean, types frozen |
| **0:45–2:45** | **Prove the splat:** Spark renders the real home, arrow-key walk works (camera moves, splat static, clamp to bounds) | Build full finder UI against mocks: mic button, transcript, results, read-aloud | **CP1:** Shaurya walks the real splat; Shivam's finder speaks mock results. Hero de-risked. |
| **2:45–4:30** | `lib/claude.ts` + `/api/search` + `/api/nav` + `/api/health`; test with curl | Tour page shell (placeholder for SplatTour) + accessibility pass on finder | **CP2:** both routes return contract-shaped JSON; `/api/health` green |
| **4:30–6:00** | Swap to real `lib/listings.ts` (12 hand-authored units) | Flip finder from mock → real `search()` (one-line source swap) | **CP3:** **Part 1 done & demoable.** Tag `v1-finder`. |
| **6:00–7:45** | `SplatTour.apply(NavCommand)` drives the camera (goto tween, move/turn/look); mount into Shivam's TourShell | Wire `TourVoiceBar` → `/api/nav` → `splatRef.apply(cmd)` + `speak(cmd.speech)`; Tour CTA on a ListingCard | **CP4:** "take me to the kitchen" walks the real splat. **Part 2 done.** Tag `v2-tour`. |
| **7:45–9:30** | Tune easing/bounds, 2–3 more waypoints, README + API table, `tsc`/eslint clean | Full WCAG sweep, landing page, **record 60s fallback video**, rehearse demo ×2 | **CP5:** deployed, README done, fallback recorded. Freeze. |

---

## Demo script (~2.5 min)
1. **Impact (15s):** "For someone blind, low-mobility, or who can't drive to ten open houses, finding an accessible affordable home is exhausting. Haven lets you find *and* tour one using only your voice." Then go hands-off the keyboard.
2. **Finder (45s):** Mic → "I need a one-bedroom under fifteen hundred in Milpitas that accepts Section 8 and is wheelchair accessible — I have a dog." Live transcript → ranked results → it reads back: *"I found 3 affordable homes. Best match: Sunrise Gardens, $1,450, wheelchair accessible, Section 8. It has a walkable tour — want to go inside?"* → "Yes, take me inside."
3. **Hero (60s):** The real splat loads. Beat to let judges realize it's a *real captured space*. Arrow-key walk first, then voice-only: "Take me to the kitchen" → camera glides + "Heading to the kitchen now." → "Turn around." → "What's in this room?" (Claude describes). Every command voice.
4. **Accessibility (15s):** "Everything you saw works with zero sight and zero mouse — keyboard fallback, ARIA live regions, reduced-motion. Built for the people who need it most."
5. **Close (15s):** "Any landlord with a phone video can make a unit tourable. Open source, repo's live." Show GitHub + Vercel URL.
6. **Fallbacks:** every spoken line has a text-input twin; arrow keys always walk; pre-recorded 60s video if the splat stutters on the venue projector. Never apologize — just keep moving.

---

## If you fall behind — cut in THIS order
1. Cut any Track-3 / multilingual ideas (pure dilution).
2. Cut free-form voice nav ("turn 180", "go left") → keep **named-waypoint jumps** + arrow keys.
3. Cut TTS read-*back* before cutting speech *input* (capturing spoken preferences is the impressive half).
4. Cut the live Claude call in the finder → deterministic keyword match over seeded `listings.json`.
5. **Last resort:** cut the splat hero entirely, ship the polished voice finder. A flawless Part 1 beats a broken Part 2.

**Protect at all costs:** the pre-captured splat that loads and is **walkable with arrow keys** on the demo laptop. That's the only thing judges haven't seen. Arrow-key walking must work independently of voice.

---

## Rubric map
- **Innovation:** voice-driven navigation *inside a real 3D splat* — lead with this.
- **Technical Complexity:** in-browser splat render + Claude structured-output parsing (search + a waypoint-constrained nav union) + real-time camera tweening, behind a frozen typed contract.
- **Functionality:** two complete live flows; degrades via `ApiError.spokenFallback` instead of breaking.
- **Design & Presentation:** dark-mono + one electric accent, color in the data; tight 2.5-min script; fallback video.
- **Impact & Practicality:** serves blind / low-vision / low-mobility / non-driving renters seeking *affordable* housing — the exact track intersection; scales (any landlord + phone video).
- **Relevance-to-track:** accessibility is the architecture — ARIA live regions, full keyboard fallback, prefers-reduced-motion, affordable-housing dataset (Section 8 / LIHTC / BMR). Say so explicitly.
- **Quality-of-Code:** one frozen `lib/types.ts`, strict file ownership (no merge conflicts), discriminated-union `NavCommand`, pure-function scoring split from AI calls, README with the API table, `tsc`/eslint clean, **public repo, real commits from both.** Each person must explain their half in the live code review.

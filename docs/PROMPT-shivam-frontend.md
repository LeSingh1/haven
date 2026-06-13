# Kickoff prompt — SHIVAM (frontend · voice · accessibility)

> Paste everything below the line into your Claude to start. It's self-contained.
> You build entirely against **mock data**, so you're never blocked waiting on Shaurya.

---

You are helping me (Shivam) build the **frontend** of **Haven** at a 9–10 hour hackathon (Milpitas Hacks 3, Track 2: Housing Dignity, **accessibility-first**). Tagline: **"Find AND tour an affordable home using only your voice."** My teammate Shaurya owns the backend, the Claude AI, and the 3D Gaussian-splat tour component. I own **all the UI, the voice input/output, and the accessibility**. We share one frozen `lib/types.ts` that Shaurya owns — I import from it and **never edit it**.

There are two parts: **Part 1** a voice housing finder (build this first and fully), **Part 2** a tour page that mounts Shaurya's `<SplatTour>` and lets the user navigate by voice.

**Critical working rule: I must NEVER be blocked on Shaurya. Build 100% of the UI against mock data first.** Everything speaks `lib/types.ts`, so switching to the real backend later is a one-line source swap. **Comment your code and keep it clean — judges do a LIVE code review, so explain each piece to me and use small, clearly-named components.**

## Stack
- Next.js (App Router) + TypeScript + Tailwind. (No react-three-fiber — Shaurya's splat uses raw Three.js inside his own client component; I just mount it.)
- Voice: **Web Speech API**, browser-native, no package — `SpeechRecognition` (input) + `speechSynthesis` (output). **Chrome only, HTTPS only.**
- I never call Claude directly — only Shaurya's routes via `lib/api.ts`.

## The contract I build against (from `lib/types.ts`, do not edit)
Key types: `Listing`, `SearchQuery`, `SearchResponse`/`ApiError`, `TourMeta`, `Waypoint`, `NavCommand`, `SplatTourHandle` (`{ apply(cmd: NavCommand): void }`), `VoiceState`. Endpoints I call: `POST /api/search` → `SearchResponse`, `POST /api/nav` → `NavParseResponse`. See `BUILD.md`.

## Step 0 — Get unblocked (CP0)
Pull the repo, `npm run dev`, read `lib/types.ts` top to bottom — it's the whole contract. Then stub mocks so you can build everything immediately:
- `lib/mockListings.ts` — 8 `Listing` objects (varied rent/beds/accessibility/programs); **one** has `hasTour:true`.
- `lib/mockTour.ts` — one `TourMeta` with 4 `Waypoint`s.
- A `MOCK = true` flag in `lib/api.ts` consumers so `search()` returns `mockListings` until the real route is live.

## Design system (dark-mono + one electric accent — and WCAG-AA)
Match my taste: pure-neutral near-black UI, **one** electric accent, **color lives in the data** (match-score chips, "open"/"accessible" badges) — not in the chrome. But because this is the dignity/accessibility track, hit **WCAG-AA**: ≥4.5:1 contrast even on dark, ≥48px tap targets, visible focus rings, full keyboard operability, `aria-live` on anything that updates from voice, and respect `prefers-reduced-motion`. Accessibility *is* the product here — it's a scored category.
```css
--bg:#0A0A0B; --surface:#141416; --surface-2:#1C1C1F; --line:#26262A;
--text:#F4F4F5; --text-dim:#A1A1AA; --accent:#22D3EE;  /* electric cyan */
--good:#4ADE80; --warn:#FBBF24; --bad:#F43F5E;          /* color in the data only */
```

## Step 1 — Voice hooks (`lib/useVoiceInput.ts`, `lib/useSpeech.ts`)
Use this verified Web Speech pattern. Add `src/speech.d.ts` for the webkit types (the TS DOM lib doesn't type `webkitSpeechRecognition`).
```tsx
// lib/useVoiceInput.ts — 'use client'
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
export function useVoiceInput(onTranscript: (t: string) => void) {
  const recRef = useRef<SpeechRecognition | null>(null);
  const wantRef = useRef(false);                 // ref so onend closure sees current value
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  useEffect(() => {
    const Ctor = typeof window !== 'undefined'
      ? (window.SpeechRecognition ?? window.webkitSpeechRecognition) : undefined;
    if (!Ctor) { console.warn('SpeechRecognition unsupported — show the text fallback'); return; }
    const r = new Ctor(); r.lang = 'en-US'; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    r.onresult = (e: SpeechRecognitionEvent) => {
      let fin = '', itm = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]; (res.isFinal ? (fin += res[0].transcript) : (itm += res[0].transcript));
      }
      setInterim(itm); if (fin.trim()) { setInterim(''); onTranscript(fin.trim()); }
    };
    r.onerror = (e: SpeechRecognitionErrorEvent) => { if (e.error === 'not-allowed') { wantRef.current = false; setListening(false); } };
    r.onend = () => { if (wantRef.current) { try { r.start(); } catch {} } else setListening(false); }; // Chrome auto-stops; restart
    recRef.current = r;
    return () => { wantRef.current = false; r.abort(); };
  }, [onTranscript]);
  const start = useCallback(() => { wantRef.current = true; setListening(true); try { recRef.current?.start(); } catch {} }, []);
  const stop  = useCallback(() => { wantRef.current = false; setListening(false); recRef.current?.stop(); }, []);
  return { listening, interim, start, stop };
}
```
```tsx
// lib/useSpeech.ts — speak responses
export function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();             // don't stack utterances
  const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US';
  window.speechSynthesis.speak(u);
}
```
Recommendation from our research: prefer **push-to-talk** (hold/click the mic to record one utterance) over always-listening — it's far more reliable in a loud venue. And `start()` must be inside a user-gesture (a click), or the mic permission won't prompt.

## Step 2 — Finder UI against mocks (CP1) — `components/finder/*`
- `FinderShell` — page layout, holds `VoiceState`.
- `MicButton` — big, accessible, shows listening/thinking/speaking state; `aria-pressed`.
- `TranscriptBar` — live interim transcript, `aria-live="polite"`.
- `ResultsList` + `ListingCard` — render `Listing`s; show match-score chip, accessibility + program badges (this is where color lives), a **"Walk this home"** CTA when `hasTour`.
- `SpokenSummary` — calls `speak(response.spokenSummary)` after results land.
Wire it so: click mic → speak → see transcript → (mock) results render → it reads them aloud. **Make it fully usable on fake data.**

## Step 3 — Tour shell (CP2) — `components/tour/TourShell.tsx` + `TourVoiceBar.tsx`
`app/tour/[tourId]/page.tsx` renders `TourShell`. For now put a placeholder `<div>` where Shaurya's splat will mount. Build `TourVoiceBar` (mic + transcript + spoken-response line, reuse the voice hooks). Polish the finder's accessibility in parallel: focus rings, `aria-live` on results, keyboard-only path, large-text friendliness.

## Step 4 — Flip to real backend (CP3)
When Shaurya says `/api/search` is live, set `MOCK = false`. Because the UI already speaks `types.ts`, this is a one-line source swap. Handle the `thinking` loading state and the `ApiError.spokenFallback` path (speak the fallback so the voice UX never goes silent).

## Step 5 — Mount the splat + voice nav (CP4)
Shaurya hands you `<SplatTour>` (a `forwardRef` exposing `SplatTourHandle`). In `TourShell`:
```tsx
const splatRef = useRef<SplatTourHandle>(null);
// when TourVoiceBar produces a transcript:
async function onTourSpeech(transcript: string) {
  setState('thinking');
  const res = await parseNav(transcript, tour.waypoints.map(w => ({ id: w.id, label: w.label })));
  if (res.ok) { splatRef.current?.apply(res.command); speak(res.command.speech); }
  else speak(res.spokenFallback);
  setState('idle');
}
// render: <SplatTour ref={splatRef} tour={tour} />  +  <TourVoiceBar onSpeech={onTourSpeech} />
```
Wire the `ListingCard` "Walk this home" CTA to route to `/tour/[tourId]`. Confirm **both** arrow keys (Shaurya's) and voice move the camera. Keep a visible **text-input twin** next to the mic that feeds the same handler — so a noisy room never kills the demo.

## Step 6 — Polish (CP5)
Full WCAG sweep (aria-live regions, visible focus, `prefers-reduced-motion`, contrast, keyboard-only through both pages). Build the landing page (`app/page.tsx`) with the tagline. **Record a 60s screen-capture as the demo fallback.** Rehearse the demo script twice.

## Pitfalls (avoid these)
- **HTTPS or localhost only** — plain http blocks the mic. Demo on the **Vercel URL in Chrome** (Firefox doesn't support `SpeechRecognition`).
- **SSR guard:** construct `SpeechRecognition`/use `speechSynthesis` only inside `useEffect`/handlers (window is undefined on the server).
- **`recognition.start()` throws if already running** — wrap in try/catch (done above).
- **Pre-warm the mic** behind the landing "Enter" button so the permission prompt is accepted before judges watch.
- **Cap TTS to the top 3 results** — long read-backs drag; speak the count + first three, then "say more to hear the rest."
- **Always have the text fallback + keyboard nav** visible — a dead mic or stuttering splat must never freeze the demo.

Start with **Step 0** (mocks) so you're unblocked, then build the finder UI fully on fake data. Tell me at each checkpoint.

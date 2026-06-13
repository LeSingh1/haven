# Kickoff prompt — SHAURYA (backend · 3D splat · AI)

> Paste everything below the line into your Claude (Max account) to start. It's self-contained.
> Read `BUILD.md` for the shared contract + timeline; this is your half in detail.

---

You are helping me build **Haven** at a 9–10 hour hackathon (Milpitas Hacks 3, Track 2: Housing Dignity, accessibility-first). Tagline: **"Find AND tour an affordable home using only your voice."** I own the **backend, the 3D Gaussian-splat tour, and all the Claude AI** — my teammate Shivam owns the frontend UI and voice plumbing. We share one frozen `lib/types.ts` (I own it; he only imports). Two parts: **Part 1** a voice housing finder (build first, must work), **Part 2** a walkable, voice-navigable 3D splat tour (the hero).

**Work in order. After each step, stop and confirm it works before moving on. Comment the code as you go and keep it clean — judges do a LIVE code review and penalize AI-generated code I can't explain, so explain each piece to me as we build and keep functions small and named clearly.**

## Stack (use exactly this — versions are verified-current and pinned for a reason)
- Next.js (App Router) + TypeScript + Tailwind.
- Splat: **`@sparkjsdev/spark@2.1.0` on RAW Three.js, `three@0.180.0` (PINNED)**. Do **NOT** use `@mkkellogg/gaussian-splats-3d` or react-three-fiber for the splat — Spark needs no COOP/COEP headers (those fight Vercel) and avoids a documented R3F crash.
- AI: **Claude `claude-opus-4-8`** via `@anthropic-ai/sdk`, server routes only, using **`client.messages.parse()` + `zodOutputFormat`** (structured outputs, GA — no beta header). Key in `ANTHROPIC_API_KEY` (server-only, never `NEXT_PUBLIC_`).
- Deploy: Vercel.

```bash
npm install three@0.180.0 @sparkjsdev/spark@2.1.0 @anthropic-ai/sdk zod
```

## ⚠️ Do this BEFORE the hackathon (the #1 thing that sinks this project)
Capture the splat 2–3 days early — never day-of (Luma cloud training is slow and fails on glass/mirrors/blank walls):
1. Film a **60–90s slow, steady phone video** of one home/room. Lights on, overlap your path, orbit doorways, avoid mirrors and fast pans. Capture the same space **2–3 times** for backups.
2. Upload to **lumalabs.ai**, pick the Gaussian Splatting interactive scene type, let it train.
3. Export the **Gaussian Splat `.ply` from the Luma WEB app** (not mobile) — you get a ZIP; extract the `.ply`.
4. Convert `.ply` → **`.spz`** (~10× smaller, ~12MB) with spz-js or PlayCanvas SuperSplat. Keep the `.ply` as a fallback.
5. Commit `home.spz` (+ `home.ply`) to `public/splats/`. **The splat is a checked-in build artifact, not a hackathon task.**

## Step 1 — Scaffold + freeze the contract (CP0)
Scaffold the app, create `lib/types.ts` **exactly** as specified in `BUILD.md` (Listing, SearchQuery, Waypoint{position+quaternion}, TourMeta, NavCommand union, SplatTourHandle, the API envelopes, VoiceState). Create `lib/api.ts` with typed `search()` and `parseNav()` fetch wrappers. Commit, push to a **public** GitHub repo, add Shivam as collaborator. Don't change `types.ts` after this without telling him.

## Step 2 — PROVE THE SPLAT FIRST (highest risk, CP1) — `components/tour/SplatTour.tsx`
A client-only component (loaded via `next/dynamic` `ssr:false` — Spark touches `window`/WebGL and crashes SSR otherwise). Render the real splat, walk it with arrow keys/WASD by **moving the camera, not the splat**. Expose an imperative `apply(NavCommand)` handle (via `useImperativeHandle`) so Shivam's voice bar can drive it. Use this verified pattern:

```tsx
// app/tour/[tourId]/page.tsx loads it client-only:
// const SplatTour = dynamic(() => import('@/components/tour/SplatTour'), { ssr: false });

'use client';
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import type { SplatTourHandle, NavCommand, TourMeta } from '@/lib/types';

const SplatTour = forwardRef<SplatTourHandle, { tour: TourMeta }>(function SplatTour({ tour }, ref) {
  const mountRef = useRef<HTMLDivElement>(null);
  const camRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animRef = useRef<{ fromP: THREE.Vector3; toP: THREE.Vector3; fromQ: THREE.Quaternion; toQ: THREE.Quaternion; t: number; dur: number } | null>(null);
  const keys = useRef<Record<string, boolean>>({});

  // The one entry point the voice layer calls.
  useImperativeHandle(ref, () => ({
    apply(cmd: NavCommand) {
      const cam = camRef.current; if (!cam) return;
      const up = new THREE.Vector3(0, 1, 0);
      if (cmd.kind === 'goto') {
        const wp = tour.waypoints.find(w => w.id === cmd.waypointId); if (!wp) return;
        animRef.current = {
          fromP: cam.position.clone(), toP: new THREE.Vector3(...wp.position),
          fromQ: cam.quaternion.clone(), toQ: new THREE.Quaternion(...wp.quaternion),
          t: 0, dur: 1.5,
        };
      } else if (cmd.kind === 'turn') {
        const q = new THREE.Quaternion().setFromAxisAngle(up, THREE.MathUtils.degToRad(cmd.degrees));
        cam.quaternion.premultiply(q); // + = left/CCW
      } else if (cmd.kind === 'move') {
        const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
        const right = new THREE.Vector3().crossVectors(fwd, up).normalize();
        const m = cmd.meters ?? 1;
        if (cmd.direction === 'forward') cam.position.addScaledVector(fwd, m);
        if (cmd.direction === 'back')    cam.position.addScaledVector(fwd, -m);
        if (cmd.direction === 'right')   cam.position.addScaledVector(right, m);
        if (cmd.direction === 'left')    cam.position.addScaledVector(right, -m);
      }
      // 'look' / 'describe' / 'stop' / 'unknown': speech is handled by the UI; no camera change needed for MVP.
      clampToBounds(cam, tour.bounds);
    },
  }), [tour]);

  useEffect(() => {
    const mount = mountRef.current!;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.01, 1000);
    camera.position.set(...tour.spawn.position);
    camera.quaternion.set(...tour.spawn.quaternion);
    camRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // perf cap
    mount.appendChild(renderer.domElement);

    const spark = new SparkRenderer({ renderer }); scene.add(spark);
    const splat = new SplatMesh({ url: tour.splatUrl });
    splat.quaternion.set(1, 0, 0, 0); // Spark loads Y-down; 180° flip about X = right-side up
    scene.add(splat);

    const onDown = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const onUp   = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', onDown); window.addEventListener('keyup', onUp);

    const clock = new THREE.Clock();
    const ease = (t: number) => (t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2);
    const up = new THREE.Vector3(0, 1, 0); const fwd = new THREE.Vector3(); const right = new THREE.Vector3();
    const SPEED = 2.0;

    renderer.setAnimationLoop(() => {
      const dt = clock.getDelta();
      const a = animRef.current;
      if (a) { // waypoint flight overrides walking
        a.t = Math.min(1, a.t + dt / a.dur); const e = ease(a.t);
        camera.position.lerpVectors(a.fromP, a.toP, e);
        camera.quaternion.copy(a.fromQ).slerp(a.toQ, e);
        if (a.t >= 1) animRef.current = null;
      } else {
        camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
        right.crossVectors(fwd, up).normalize(); const d = SPEED * dt;
        if (keys.current['w'] || keys.current['arrowup'])    camera.position.addScaledVector(fwd, d);
        if (keys.current['s'] || keys.current['arrowdown'])  camera.position.addScaledVector(fwd, -d);
        if (keys.current['a'] || keys.current['arrowleft'])  camera.position.addScaledVector(right, -d);
        if (keys.current['d'] || keys.current['arrowright']) camera.position.addScaledVector(right, d);
        clampToBounds(camera, tour.bounds);
      }
      renderer.render(scene, camera);
    });

    const onResize = () => { camera.aspect = mount.clientWidth/mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth, mount.clientHeight); };
    window.addEventListener('resize', onResize);
    return () => { renderer.setAnimationLoop(null); window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); window.removeEventListener('resize', onResize); renderer.dispose(); mount.removeChild(renderer.domElement); };
  }, [tour]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
});
export default SplatTour;

function clampToBounds(cam: THREE.PerspectiveCamera, b: TourMeta['bounds']) {
  cam.position.x = Math.max(b.min[0], Math.min(b.max[0], cam.position.x));
  cam.position.y = Math.max(b.min[1], Math.min(b.max[1], cam.position.y));
  cam.position.z = Math.max(b.min[2], Math.min(b.max[2], cam.position.z));
}
```
**Goal of this step:** the captured home renders >30fps and I can walk it with arrow keys. If it won't render in ~60–90 min, tell me — we drop to the fallback ladder in `BUILD.md` immediately.

## Step 3 — Measure waypoints → `lib/tourData.ts`
Add a temporary keypress that `console.log`s `camera.position` and `camera.quaternion`. Fly to each room (entrance, kitchen, living room, bedroom, bathroom), log both, and hardcode them as `Waypoint`s (with `aliases` like `["cooking area"]`) plus `bounds` and `spawn` into a `TourMeta` in `lib/tourData.ts`. 4–6 waypoints is plenty. This is the only way "take me to the kitchen" can work — there are no semantic labels in a splat.

## Step 4 — Claude routes (CP2) — `lib/claude.ts`, `lib/prompts.ts`, `app/api/*`
One Anthropic client (`new Anthropic()`), model `claude-opus-4-8`, structured outputs.

`/api/search` — extract a `SearchQuery`, then rank with **pure-TS** scoring (no AI in scoring — keep it explainable):
```ts
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
const client = new Anthropic();
const Q = z.object({
  city: z.string().nullable(), maxRentUsd: z.number().nullable(),
  minBedrooms: z.number().nullable(), maxBedrooms: z.number().nullable(),
  petsRequired: z.boolean().nullable(),
  requiredAccessibility: z.array(z.string()), requiredPrograms: z.array(z.string()),
  seniorOnly: z.boolean().nullable(), veteranPriority: z.boolean().nullable(), rawNotes: z.string(),
});
export async function POST(req: Request) {
  const { transcript } = await req.json();
  try {
    const m = await client.messages.parse({
      model: 'claude-opus-4-8', max_tokens: 512,
      system: 'Convert a spoken affordable-housing request into the schema. Use null/[] for anything not said. maxRentUsd is monthly rent as a number. acceptsVouchers/section 8 -> requiredPrograms includes "section_8". Accessibility tags are snake_case (wheelchair_accessible, ground_floor, grab_bars, ...).',
      messages: [{ role: 'user', content: transcript }],
      output_config: { format: zodOutputFormat(Q, 'housing_search') },
    });
    const query = { ...m.parsed_output, sourceTranscript: transcript };
    const results = scoreListings(query);                  // lib/scoring.ts, pure TS
    return Response.json({ ok: true, query, results, spokenSummary: summarize(results) });
  } catch {
    return Response.json({ ok: false, error: 'claude_failed', spokenFallback: "Sorry, I didn't catch that — try saying a budget and number of bedrooms." });
  }
}
```
`/api/nav` — Claude returns flat fields incl. a `speech` string; **constrain the room list to `availableWaypoints`** so it can't invent a room; map the flat result into the `NavCommand` union on the server:
```ts
const Nav = z.object({
  action: z.enum(['goto','move','turn','look','describe','stop','unknown']),
  direction: z.enum(['forward','back','left','right','up','down']).nullable(),
  degrees: z.number().nullable(),
  targetRoom: z.string().nullable(),   // must be one of availableWaypoints' ids/labels
  speech: z.string(),                  // natural confirmation, e.g. "Heading to the kitchen now."
});
// system prompt lists the exact availableWaypoints; map action -> NavCommand union, return { ok:true, command }.
```
`/api/health` — pings Claude with a 1-token request; returns `{ ok:true, claude:'reachable' }`. Use it at CP2 to confirm the key works end-to-end.

## Step 5 — Real listings (CP3) — `lib/listings.ts` + `lib/scoring.ts`
Hand-author **12–20 real Fremont/Milpitas affordable + ADA-accessible units** in the `Listing` shape (Section 8 / LIHTC / BMR, `wheelchair_accessible`/`ground_floor`/etc., realistic rents). 1–2 have `hasTour:true` pointing at your real `tourId`. `scoring.ts` filters by hard constraints, then ranks by soft match, fills `matchReasons` + `distanceMiles`. Real curated data = Impact points and is the demo-safe spine (no live scraping). *(Optional flourish: badge a result "within HUD Fair Market Rent" via the free HUD FMR API in `lib/hud.ts`, wrapped in try/catch.)*

## Step 6 — Wire the tour (CP4)
Implement `SplatTour.apply()` fully (goto tween + move/turn). Hand Shivam the `<SplatTour>` to mount in his `TourShell` slot; he passes you `NavCommand`s from `/api/nav` via the ref. Tune easing so it reads as a smooth glide; respect `prefers-reduced-motion` (jump instead of tween).

## Step 7 — Polish (CP5)
Tune bounds so no command flies through walls; add 2–3 more waypoints; write the README **architecture + API-contract table** (Quality-of-Code points); `tsc` + eslint clean; redeploy to Vercel.

## Pitfalls (these will bite — avoid them)
- **Pin `three@0.180.0`.** A mismatched three version silently renders nothing with Spark. #1 failure mode.
- **SSR crash:** the splat component must be loaded with `next/dynamic` `ssr:false`; a plain `'use client'` is not enough (the module still imports during SSR).
- **`.spz` on iOS 16.2** doesn't render (Spark issue #262) — keep the `.ply` fallback and test the demo device.
- **Move the camera, never the splat.** Keep the splat at origin; animate `camera.position`/`quaternion` only.
- **Waypoint coords are scene-specific** — measure them from YOUR splat; the example numbers are placeholders.
- **Never live-scrape Zillow** (Cloudflare fails on stage). Seeded `listings.ts` is the source of truth.
- **Keys server-side only.** `ANTHROPIC_API_KEY` / `HUD_API_TOKEN` never `NEXT_PUBLIC_`.

Start with **Step 1**, then **Step 2 (prove the splat) before anything else**. Tell me at each checkpoint and explain the code so I can defend it in the review.

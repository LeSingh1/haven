# HAVEN — Full Build Documentation

> **"Tell your story once. Haven carries it from here."**
> Milpitas Hacks 3 — Track 2: Housing Dignity (HOPE for the unhoused).
> A dignity-first AI companion for people experiencing housing insecurity.

**Team**
- **Person A — Shaurya** (Claude Max 20×) → **Backend** (AI + data + API)
- **Person B — Shivam** (Claude $20) → **Frontend** (UI + screens + design)

> Why this split fits the accounts: the backend is AI-heavy and needs lots of
> prompt iteration → Shaurya's Max 20× has the headroom. The frontend is
> self-contained and can be built entirely against **mock data**, so Shivam is
> never blocked waiting on the API and won't burn through the $20 limits.

---

## 1. The concept (what we're building)

1. **One story, in your words** — the user *speaks or types* their situation once. Claude turns that messy free text into a structured private profile (no forms).
2. **The next step, not the maze** — Haven returns **one clear next action** + the 2–3 resources that actually fit *right now* (open tonight, accepts kids, no ID), each with address, hours, what to bring, what to say. Plain language, their language.
3. **A path you can carry** — a calm "path to stable housing" (tonight → this week → stable) + a one-tap **"share my situation"** so they never re-tell their story.

---

## 2. THE CONTRACT (read this first — it's what lets you both work in parallel)

Backend and frontend agree on these JSON shapes **now and don't change them**. Frontend builds against the mock fixture; backend produces the same shape. Integration = flip one URL.

### Shared types — `lib/types.ts` (Shaurya creates this first, both import it)
```ts
export type Lang = "en" | "es" | "vi" | "zh" | "tl"; // top Santa Clara County languages

export type ResourceCategory =
  | "shelter" | "food" | "hygiene" | "health" | "legal" | "employment" | "financial";

export interface Resource {
  id: string;
  name: string;
  category: ResourceCategory;
  address: string;
  distanceNote?: string;       // "0.8 mi away"
  hours: string;               // "Open until 9:00 PM"
  openNow: boolean;
  phone?: string;
  eligibility: string[];       // ["Accepts children", "No ID required"]
  bring: string[];             // ["Photo ID if you have one"]
  whatToSay?: string;          // a short script to reduce anxiety
  acceptsPets?: boolean;
  acceptsFamilies?: boolean;
}

export interface Profile {
  summary: string;             // one neutral, dignified sentence
  household: { adults: number; children: number; pets: boolean };
  needs: ResourceCategory[];   // ranked
  constraints: string[];       // ["No car", "No ID", "Needs a bed tonight"]
  urgency: "tonight" | "this_week" | "planning";
  language: Lang;
}

export interface PlanStep {
  when: "tonight" | "this_week" | "soon";
  title: string;               // "Get a safe place to sleep tonight"
  detail: string;              // plain-language explanation
  resourceIds: string[];       // resources that fulfill this step
}

export interface IntakeResponse {
  profile: Profile;
  nextStep: PlanStep;          // THE one action to take now
  path: PlanStep[];            // tonight → this week → stable
  resources: Resource[];       // matched + ranked (referenced by steps)
}

export interface ShareSummary {
  text: string;                // clean handoff summary for a service worker
}
```

### Endpoints (backend provides, frontend consumes)

**`POST /api/intake`**
```jsonc
// request
{ "text": "I'm a mom with a 6 year old, no car, sleeping in my car, need a bed tonight", "language": "en" }
// response  →  IntakeResponse
```

**`POST /api/share`**
```jsonc
// request
{ "profile": { /* Profile */ } }
// response  →  ShareSummary
```

### Mock fixture — `mock/intake.sample.json`
Shaurya commits a realistic `IntakeResponse` here on hour 1. **Shivam builds the entire UI against this file** until the real route is live. (Provide 2–3 sample situations.)

```ts
// lib/api.ts — the seam. Flip USE_MOCK to false at integration time.
const USE_MOCK = true;
export async function intake(text: string, language: Lang): Promise<IntakeResponse> {
  if (USE_MOCK) return (await import("@/mock/intake.sample.json")).default as IntakeResponse;
  const r = await fetch("/api/intake", { method: "POST", body: JSON.stringify({ text, language }) });
  return r.json();
}
```

---

## 3. Architecture

```
 BROWSER (Shivam owns)                         SERVER (Shaurya owns)
 ┌───────────────────────────┐                 ┌─────────────────────────────┐
 │ IntakeScreen (text+voice)─┼──intake(text)──▶│ /api/intake                  │
 │ PlanScreen                │                 │  Claude: text → Profile      │
 │  ├ NextStepCard           │◀──IntakeResponse│  match Profile → resources   │
 │  ├ ResourceCard[]         │                 │  Claude: → nextStep + path   │
 │  ├ PathView (the journey) │                 │  (plain language, multiling.)│
 │  └ ShareSheet ────────────┼──share(profile)▶│ /api/share → ShareSummary    │
 │ design system (warm/a11y) │                 │ resources.json (curated)     │
 └───────────────────────────┘                 └─────────────────────────────┘
        builds against mock/                      Anthropic API (claude-opus-4-8)
```

---

## 4. Backend spec — **Shaurya** (Claude Max 20×)

**Owns:** `app/api/**`, `lib/types.ts`, `lib/match.ts`, `public/resources.json`, `mock/intake.sample.json`.

### Stack
- Next.js (App Router) API routes, TypeScript.
- `@anthropic-ai/sdk`, model **`claude-opus-4-8`**, key in `ANTHROPIC_API_KEY` (server-only).

### `/api/intake` — the core route
1. Take `text` + `language`.
2. **Claude call #1 — structured extraction:** free text → `Profile` using structured outputs (force the schema).
3. **`lib/match.ts` — deterministic matching:** filter/rank `resources.json` by `needs`, `constraints`, `urgency`, `openNow`, `acceptsFamilies/Pets`. *Plain code, not AI — fast, explainable in the code review.*
4. **Claude call #2 — plan generation:** given the profile + matched resources, produce `nextStep` + `path` in plain language, **in the user's `language`**.
5. Return `IntakeResponse`.

```ts
// app/api/intake/route.ts (sketch)
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import resources from "@/public/resources.json";
import { matchResources } from "@/lib/match";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

const PROFILE_SCHEMA = { /* JSON schema mirroring Profile */ } as const;

export async function POST(req: NextRequest) {
  const { text, language } = await req.json();

  // 1) extract structured profile
  const profileRes = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    messages: [{ role: "user", content:
      `Extract a housing-insecurity profile from this person's words. Be neutral and dignified. Language: ${language}.\n\n"${text}"` }],
    output_config: { format: { type: "json_schema", schema: PROFILE_SCHEMA } },
  });
  const profile = JSON.parse(profileRes.content.find(b => b.type === "text")!.text);

  // 2) deterministic match (explainable, fast)
  const matched = matchResources(resources, profile);

  // 3) plan + path in plain language, user's language
  const planRes = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1500,
    messages: [{ role: "user", content:
      `Given this profile and these resources, write ONE next step and a path (tonight→this week→stable) in plain ${language}. Warm, concrete, no jargon.\nProfile:${JSON.stringify(profile)}\nResources:${JSON.stringify(matched)}` }],
    output_config: { format: { type: "json_schema", schema: { /* nextStep+path */ } } },
  });
  const plan = JSON.parse(planRes.content.find(b => b.type === "text")!.text);

  return NextResponse.json({ profile, ...plan, resources: matched });
}
```

### `public/resources.json` (do this early — it's also your Impact score)
Curate **real Milpitas / Santa Clara County resources**: shelters, food banks, hygiene/showers, clinics, legal aid, workforce. ~15–25 entries in the `Resource` shape. Real data → judges believe it.

### `/api/share`
One Claude call: `Profile` → a clean, respectful summary a service worker can read in 10 seconds. Return `ShareSummary`.

### Shaurya's order
1. `lib/types.ts` + `mock/intake.sample.json` (unblocks Shivam) → push immediately.
2. `resources.json` (real data).
3. `lib/match.ts` (pure function — unit-test it).
4. `/api/intake` (both Claude calls + structured outputs).
5. `/api/share`. 6. Multilingual pass. 7. Help integrate + rehearse the route walkthrough.

---

## 5. Frontend spec — **Shivam** (Claude $20)

**Owns:** `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `components/**`, `lib/api.ts`. **Never edits `app/api/**`.**

### Stack
- Next.js + React + TypeScript + Tailwind. Deploy on **Vercel**.
- Voice input via the browser **Web Speech API** (frontend captures transcript → sends `text`).

### Screens / components
- **IntakeScreen** — big, calm prompt; a large text box **and** a mic button (Web Speech API → transcript). A language selector (`Lang`).
- **PlanScreen**
  - **NextStepCard** — the one action, big and reassuring (`nextStep`).
  - **ResourceCard** — name, open-now badge, hours, distance, eligibility chips, "what to bring," "what to say," call button.
  - **PathView** — the journey: tonight → this week → stable, with completed-step states.
  - **ShareSheet** — modal showing `ShareSummary.text` + a copy button.
- **States** — loading (a calm "putting your plan together…"), empty, and error states.

### Mock workflow (so you're never blocked)
Build everything against `mock/intake.sample.json` via `lib/api.ts` (`USE_MOCK = true`). When Shaurya says the route is live, flip `USE_MOCK = false`. That's the whole integration.

### Design direction — **warm, accessible, dignified** (deliberate)
This audience needs warmth and clarity, not dark-tech. (Shaurya: this is the one project to *not* use the dark-mono palette — judges read warmth as on-theme for dignity work, and it scores Design + Impact.)
```css
--bg:      #FAF7F2;  /* warm paper */
--surface: #FFFFFF;
--ink:     #1F2421;  /* near-black, high contrast */
--ink-dim: #5B635E;
--accent:  #0E7C66;  /* calm, trustworthy teal */
--good:    #2E7D32;  /* "open now" */
--warn:    #B45309;  /* "closing soon" */
--line:    #E7E1D8;
```
- **Font: Public Sans** (the U.S. government accessibility typeface — thematically perfect for a civic dignity tool *and* genuinely legible). Min 18px body.
- **WCAG-AA**: ≥4.5:1 text contrast, ≥48px tap targets, full keyboard nav, clear focus rings, alt text. Accessibility *is* dignity here — call it out in the pitch.
- Soft rounded cards, generous spacing, no clutter. One clear action per screen.

### Shivam's order
1. App shell + design tokens + Public Sans + layout.
2. IntakeScreen (text first, mic second).
3. PlanScreen with NextStepCard + ResourceCard against the mock.
4. PathView + ShareSheet. 5. Loading/empty/error states + a11y pass. 6. Flip to real API + deploy.

---

## 6. Repo & git workflow (important for two people)

**Make a shared GitHub repo.** Two reasons: (1) it's how you sync across two laptops, (2) the rubric's top Quality-of-Code score *requires* "Code is open source." Make it **public**.

```bash
# one person creates it, both clone
npx create-next-app@latest haven --typescript --tailwind --app --eslint
cd haven && git init && gh repo create haven --public --source=. --push
```

**Avoid merge conflicts by ownership, not by luck:**
- Shaurya only touches `app/api/**`, `lib/types.ts`, `lib/match.ts`, `public/resources.json`, `mock/**`.
- Shivam only touches `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `components/**`, `lib/api.ts`.
- The **only shared file is `lib/types.ts`** — Shaurya owns it; Shivam imports, never edits. Agree on it in the first 20 minutes.
- Work on `backend` / `frontend` branches, PR into `main`, or just push to `main` in your own folders since you don't overlap. Pull before you push.

---

## 7. Build timeline (parallel)

| Time | Shaurya (backend) | Shivam (frontend) | Sync |
|---|---|---|---|
| **9:00–9:30** | Scaffold repo, `types.ts`, **commit mock fixture** | Clone, app shell, design tokens | ✅ agree on `types.ts` |
| **9:30–12:00** | `resources.json` (real data) → `match.ts` → `/api/intake` | IntakeScreen + PlanScreen vs **mock** | — |
| **12:00–13:00** | *Lunch* | *Lunch* | — |
| **13:00–14:30** | finish `/api/intake`, `/api/share` | PathView + ShareSheet + states | — |
| **14:30–15:00** | **route live** | **flip `USE_MOCK=false`** | 🔌 integrate |
| **15:00–16:30** | multilingual + harden + edge cases | voice input + a11y pass + polish | — |
| **16:30–18:00** | deploy to Vercel, rehearse code walkthrough | rehearse demo, record fallback video | 🎤 |

---

## 8. Rubric mapping (how Haven scores)

| Category | How we earn 9–10 |
|---|---|
| **Innovation** | The "tell your story once, the system carries it" inversion. |
| **Relevance** | Hits every verb in the Track 2 brief verbatim. |
| **Impact** | Real local resources, HOPE-aligned, scalable, accessibility-first. |
| **Functionality** | Judges type/speak a situation live and get a real plan. |
| **Design & Presentation** | Warm, WCAG-AA, dignified UI + a rehearsed demo. |
| **Technical Complexity** | Claude structured extraction + deterministic matching + plan generation + multilingual + voice. |
| **Quality of Code** | Clean, commented, **public repo**, and **each person can explain their half** in the live code review. (Shaurya → `/api/intake` + `match.ts`; Shivam → the API seam + a component.) |

> ⚠️ Code-review prep: judges penalize "blatantly AI-generated" code you can't explain. **Comment as you go and make sure you each understand your own files.**

---

## 9. Setup & env

```bash
npm i @anthropic-ai/sdk            # backend
# .env.local (server-only — NEVER prefix with NEXT_PUBLIC)
ANTHROPIC_API_KEY=sk-ant-...
```
Frontend needs no secrets. Voice = Web Speech API (browser, no key).

## 10. Demo script (~4–5 min cap)
1. Speak a real-sounding situation into Haven.
2. Watch it build the profile + surface **tonight's one step** + 2 matching resources.
3. Scrub the **path to stable housing**.
4. Tap **"share my situation"** → clean handoff summary.
5. Close: *"She told her story once. Haven carries it from here."*
Pre-seed 2–3 situations so it never fails live; keep "type your own" for a curious judge.

## 11. Integration checklist
- [ ] `types.ts` agreed and imported by both
- [ ] mock fixture matches `IntakeResponse` exactly
- [ ] `USE_MOCK` flipped to false, real `/api/intake` returns valid shape
- [ ] `/api/share` wired to ShareSheet
- [ ] multilingual verified in one non-English language
- [ ] voice input works on the demo laptop
- [ ] deployed to Vercel, public repo, both rehearsed for code review
```

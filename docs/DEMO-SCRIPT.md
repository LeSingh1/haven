# Haven — Live Demo Script (5:00)

**Event:** Milpitas Hacks 3 · Housing Dignity track
**Team:** **Shaurya** (drives the laptop, talks to Haven by voice) · **Shivam** (tells the story, explains the tech, **plays the realtor** on the live call)
**Tagline:** *Find AND tour an affordable, accessible home — and book the viewing — using only your voice.*
**The arc:** a person who can't tour homes in person → searches by voice → walks the home in 3D → and Haven **autonomously phones the realtor and books the viewing, live on speaker.**

> Tight 5 minutes. Rehearse the six **bold quoted** lines out loud twice — those are spoken *to the app* by **Shaurya**. Everything else is narration. Keep laptop audio up so the room hears Haven talk back.

---

## ✅ PRE-FLIGHT (before you walk on)

- [ ] **Run on `localhost:3000`, not Vercel.** The live call needs the local `.env.local` secrets. `cd ~/Claude/projects/haven && npm run dev` → open `http://localhost:3000` in **Chrome**. (localhost = mic works on http, splats load from disk, call creds are live.)
- [ ] **Point the call at Shivam's phone.** The call dials `DEMO_REALTOR_PHONE`, currently *Shaurya's* number. Set it to **Shivam's mobile** (E.164, `+1510…`) in `.env.local` so Shivam answers his own phone as the realtor, then **restart `npm run dev`** (env changes need a restart). *(No time to edit env? Just hand Shaurya's phone to Shivam — same result.)*
- [ ] **Make the buyer "Maria."** Set `NEXT_PUBLIC_DEMO_BUYER_NAME=Maria` in `.env.local` (restart after). Then Haven says *"Got it, Maria…"* and the AI tells the realtor a buyer named Maria is interested — it ties the climax straight back to the cold open.
- [ ] **Twilio balance topped up** (it was low). Place **one test call backstage** with the exact booking line below to confirm the agent connects.
- [ ] **Phone:** charged, **ringer ON, on speaker**, DND off, good signal, sitting next to the laptop mic.
- [ ] **Pre-grant the mic:** load `/finder` once, click *Allow*. Pre-warm the tour once so `lst-001`'s splats are cached.
- [ ] **Tabs:** Tab 1 `localhost:3000` (landing) · Tab 2 `/calls` (live transcript = safety net) · Tab 3 `/dashboard` (closing reveal).

---

## RUN OF SHOW

### 0:00 – 0:30 · Cold open — the problem · **Shivam**
*On screen: the landing page. Headline: "Find AND tour an affordable home using only your voice."*

**SHIVAM:**
> "Meet Maria. She uses a wheelchair. Every affordable apartment she finds online means asking a friend to drive her across town — just to find out there are three steps at the front door. For millions of people with mobility, vision, or hearing differences, the housing *search itself* is the barrier. We built **Haven** to remove it. Maria never leaves her chair. Watch — Shaurya won't touch the keyboard."

*Shaurya clicks **Start searching** → `/finder`. (Last keyboard touch of the demo.)*

---

### 0:30 – 1:15 · Search by voice · **Shaurya** drives / **Shivam** narrates
**SHAURYA** *(taps mic, speaks):*
> **"Show me a two-bedroom under sixteen hundred a month in Milpitas that's wheelchair accessible and takes Section 8."**

*Listings animate in; Haven reads a summary aloud. 421 Oak Street is the top match (96%).*

**SHIVAM:**
> "That wasn't keyword search — Claude parsed her intent: beds, budget, city, wheelchair access, *and* Section 8 eligibility, then ranked by fit. Every card is labeled for accessibility up front, so there are no wasted trips."

**SHAURYA:**
> **"Walk me through the two-bedroom on Oak Street."**

*Tour begins loading.*

---

### 1:15 – 2:30 · Walk the home in 3D · **Shaurya** drives / **Shivam** narrates
*On screen: the Gaussian-splat tour of 421 Oak Street.*

**SHIVAM:** "This is a real 3D Gaussian-splat capture of the home — not a photo. A space she can move through, by voice."

**SHAURYA** *(mic, one at a time):*
> **"Turn around."** … **"Take me to the kitchen."**

*(camera turns, then the scene transitions to the kitchen)*

**SHIVAM:** "Turn, look around, jump room to room — all spoken. Prefer a mouse? Drag to look, scroll to zoom, Street-View style. And the panel on the right is the listing at a glance — value, square footage, the accessibility features, the agent."

**SHAURYA** *(mic — the dealbreaker question):*
> **"Is this place good for someone in a wheelchair, and when was it built?"**

*Haven answers out loud, grounded in the real listing — wide doors, grab-bars, ground-floor, Section 8 + LIHTC.*

**SHIVAM:** "That answer comes from the listing's actual data — Haven won't invent a ramp that isn't there. She's toured the home and cleared her own dealbreakers without leaving the room. So she does what anyone would — she books a viewing."

---

### 2:30 – 4:05 · THE CLIMAX — Haven calls the realtor, live · **Shaurya** triggers / **Shivam** = realtor
*Still in the tour. Phone on the podium, on speaker.*

**SHAURYA** *(to the app):*
> **"Book a viewing for this Saturday afternoon."**

*Haven replies "Got it, Maria — I'm reaching out to the listing agent…" and a **3‑2‑1 countdown** appears before it dials (a safety gate so a misheard phrase never calls).*

**SHIVAM** *(over the countdown, to the audience):*
> "She didn't email a form into the void. Three… two… one — Haven is placing a **real phone call**: ElevenLabs voice over Twilio, to the listing agent. That's my phone. I'm the realtor."

*Shivam's phone rings. He answers on speaker:*

**SHIVAM** *(as realtor):* "Hello, this is the listing office."
> *Haven:* "Hi! I'm calling on behalf of Maria, a buyer interested in 421 Oak Street in Milpitas. She'd love to see it this Saturday afternoon — does that work?"

**SHIVAM** *(as realtor, keep it short):* "Saturday at 2 works — I'll put her down."
> *Haven:* "Perfect, I'll let her know. Thank you!"

*Shivam hangs up.*

**SHIVAM:** "A real call, booked on its own, using this home's exact details. From a voice search to a confirmed viewing — Maria never touched a keyboard."

> ⚠️ **If audio lags / call drops:** Shaurya cuts to the **`/calls`** tab — the same conversation streams there as a live transcript. Narrate over it. Never hard-fails.

---

### 4:05 – 4:40 · Proof + built for everyone · **Shaurya** drives / **Shivam** narrates
*Shaurya opens `/calls` (transcript of the call you just heard), then `/dashboard` (numbers counting up).*

**SHIVAM:**
> "Every call is logged with its full transcript — here's the one you just heard. And the dashboard streams the whole journey live: the search, the walkthrough, the questions, the booking, the call. Voice-first, fully keyboard-operable, WCAG-AA. Nothing we just did needed a mouse — or a single trip across town."

---

### 4:40 – 5:00 · Close · **both**
*Back to the landing page.*

**SHAURYA:** "Find and tour an affordable home using only your voice."
**SHIVAM:** "Maria found her home, toured it, and booked the viewing — from one chair. That's Haven. Thank you."

---

## VERBATIM VOICE COMMANDS (rehearse these six)
1. **"Show me a two-bedroom under sixteen hundred a month in Milpitas that's wheelchair accessible and takes Section 8."**
2. **"Walk me through the two-bedroom on Oak Street."**
3. **"Turn around."**
4. **"Take me to the kitchen."**
5. **"Is this place good for someone in a wheelchair, and when was it built?"**
6. **"Book a viewing for this Saturday afternoon."**  ← *fires the 3‑2‑1 countdown, then the live call*

*Each works via the Claude command brain and the keyword fallback (`book`, `kitchen`, `turn`, street name), so they still fire if Claude is slow. **Scene-proof tip:** "turn around / look up / move forward / zoom in / next room" work in ANY scene — if a room label ever changes, fall back to those.*

## CONTINGENCY CARD
| If… | Do this |
|---|---|
| Mic won't catch a line | Type the exact line into the text box next to the mic — same engine, instant. Keep talking. |
| Search returns nothing | Say **"Open the most affordable one"**, or click **Take a 3D tour** on the landing → goes straight to `lst-001`. |
| Tour splats slow to load | Narrate the accessibility story over the "Entering the home…" loader; they pop in seconds. (You pre-warmed it.) |
| Phone doesn't ring | Booking still confirms on screen + logs to `/calls` & `/dashboard`. Say "on a flaky venue network it falls back to a simulated call — here's the transcript." Cut to `/calls`. Honest, still lands. |
| Over time | Drop command #3 ("Turn around") and tighten the close. |

## TIMING BUDGET
| Section | Window | Length |
|---|---|---|
| Cold open (Maria) | 0:00–0:30 | 30s |
| Voice search | 0:30–1:15 | 45s |
| 3D tour + Q&A | 1:15–2:30 | 75s |
| **Live realtor call** | 2:30–4:05 | 95s |
| Calls + dashboard | 4:05–4:40 | 35s |
| Close | 4:40–5:00 | 20s |
| **Total** | | **5:00** |

## ONE-LINERS (for judges / Q&A)
- **What:** voice-first affordable-housing search + walkable 3D splat tour + an AI that calls the realtor to book the viewing.
- **Why:** the entire housing search becomes accessible to people who can't use a typical screen-and-mouse interface.
- **Tech:** Next.js + Claude (search, navigation, home Q&A, command brain) · Spark Gaussian-splat 3D · Web Speech voice I/O · ElevenLabs Conversational AI + Twilio for the autonomous realtor call · live activity dashboard.
- **Built by two people in a day.**

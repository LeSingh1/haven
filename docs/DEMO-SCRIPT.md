# Haven — Live Demo Script (5:00, judge-facing)

**Event:** Milpitas Hacks 3 · Housing Dignity track
**Team:** **Shaurya** (drives the laptop, talks to Haven by voice) · **Shivam** (pitches + explains the tech, **plays the realtor** on the live call)
**Tagline:** *Find, tour, and book an affordable, accessible home — using only your voice.*
**Thesis for judges:** for the millions of people with a mobility, vision, or hearing disability, every existing housing tool assumes you can see a screen, work a mouse, drive out to tour, and phone a realtor. Haven removes all four assumptions.

> Tight 5 minutes. The **bold quoted** lines are spoken *to the app* by **Shaurya** — rehearse them out loud twice. Everything else is narration. Keep laptop audio up so the room hears Haven talk back.

---

## RUN OF SHOW

### 0:00 – 0:30 · The pitch · **Shivam**
*On screen: landing page — "Find AND tour an affordable home using only your voice."*

**SHIVAM:**
> "Judges — finding affordable housing is hard for anyone. But for someone with a mobility, vision, or hearing disability, every tool out there assumes you can see a screen, work a mouse, drive across town to tour, and pick up the phone to a realtor. Haven throws out all four assumptions. It's a voice-first platform to find, tour, and book an accessible, affordable home — start to finish, without touching a keyboard or leaving your chair. Watch the whole journey, hands-free."

*Shaurya clicks **Start searching** → `/finder`. (Last keyboard touch of the demo.)*

---

### 0:30 – 1:15 · Search by voice · **Shaurya** drives / **Shivam** narrates
**SHAURYA** *(taps mic, speaks):*
> **"Show me a two-bedroom under sixteen hundred a month in Milpitas that's wheelchair accessible and takes Section 8."**

*A full grid of results animates in, best match first — 421 Oak Street on top. Haven reads a summary aloud.*

**SHIVAM:**
> "No typing, no mouse — and Haven reads the results back out loud, so it works for someone who can't see the screen. And that wasn't keyword matching: Claude parsed the intent — beds, budget, city, wheelchair access, Section 8 eligibility — and every result is labeled for accessibility up front. So you never waste a trip on a home with stairs at the door."

**SHAURYA:**
> **"Walk me through the two-bedroom on Oak Street."**

*Tour begins loading.*

---

### 1:15 – 2:35 · Tour by voice — and the honesty beat · **Shaurya** drives / **Shivam** narrates
*On screen: the 3D Gaussian-splat tour, showing 421 Oak Street.*

**SHIVAM:** "This is a real 3D-captured room — a Gaussian splat you move through by voice. Note what it is: a bright, **step-free** main room. Someone who can't travel across town tours it from their chair."

**SHAURYA** *(mic, one at a time):*
> **"Take me to the bookshelves."** … **"Show me the study desk."**

*(the camera moves to each vantage — Haven narrates as it goes)*

**SHIVAM:** "Move around the space entirely by voice. It's fully keyboard-operable too, and built to WCAG-AA."

**SHAURYA** *(mic — the honesty beat):*
> **"Show me the kitchen."**

*Haven answers honestly: "That room isn't part of this 3D tour — it only covers the home's main room."*

**SHIVAM:**
> "And this is the part we're proudest of — Haven won't fake it. It only captured the main room, so it tells you that, instead of hallucinating a kitchen. For someone deciding whether a home is even worth the trip, that honesty is the whole point."

**SHAURYA** *(mic — the question that decides everything):*
> **"Is this home good for someone using a wheelchair, and does it take Section 8?"**

*Haven answers out loud, grounded in the listing's real data — wheelchair-accessible, ground-floor, wide doors, grab bars; Section 8 and LIHTC.*

**SHIVAM:** "Spoken answer, from the listing's actual data — the accessibility facts that decide whether this home is an option at all. She's cleared her dealbreakers without leaving the room. So she books a viewing."

---

### 2:35 – 4:05 · THE CLIMAX — Haven calls the realtor, live · **Shaurya** triggers / **Shivam** = realtor
*Phone on the podium, on speaker.*

**SHAURYA** *(to the app):*
> **"Book a viewing for this Saturday afternoon."**

*Haven confirms out loud and a **3‑2‑1 countdown** appears before it dials (a safety gate so a misheard phrase never calls).*

**SHIVAM** *(over the countdown, to the judges):*
> "Here's the part that closes the loop. Calling a realtor is itself a barrier — for someone who's deaf, hard of hearing, non-verbal, or has phone anxiety, it's the hardest step. So Haven makes the call for them. Three, two, one — that's a **real phone call** going out right now over Twilio, with an ElevenLabs voice. That's my phone. I'm the realtor."

*Shivam's phone rings. He answers on speaker:*

**SHIVAM** *(as realtor):* "Hello, this is the listing office."
> *Haven:* "Hi! I'm calling on behalf of a buyer interested in 421 Oak Street in Milpitas. They'd love to see it this Saturday afternoon — does that work?"

**SHIVAM** *(as realtor, keep it short):* "Saturday at 2 works — I'll put them down."
> *Haven:* "Perfect, I'll let them know. Thank you!"

*Shivam hangs up.*

**SHIVAM:**
> "A real call, placed by the AI on its own, using this home's exact details — and it booked the viewing. From a voice search to a confirmed appointment: zero keyboard, zero mouse, zero travel, and zero phone call the user had to make themselves."

> ⚠️ **If audio lags / call drops:** keep narrating — the booking already succeeded on screen. The full transcript lands on the **`/calls`** tab a few seconds *after* the call ends (it finalizes when the call completes, not mid-call), so wrap the call, then cut to `/calls` and read it back. Never hard-fails.

---

### 4:05 – 4:40 · Proof + built for everyone · **Shaurya** drives / **Shivam** narrates
*Shaurya opens `/calls` (transcript — reachable via the dashboard's "Call history →" link), then `/dashboard`.*

**SHIVAM:**
> "Every call is logged with the full transcript — here's exactly what was said, fully auditable. And the dashboard streams the whole journey live: the search, the walkthrough, the accessibility questions, the booking, the call. Voice-first, keyboard-operable, WCAG-AA — nothing we did needed a mouse, or a single trip across town."

---

### 4:40 – 5:00 · Close · **both**
*Back to the landing page.*

**SHAURYA:** "Find, tour, and book an affordable, accessible home — using only your voice."
**SHIVAM:** "Search, tour, ask, and book — start to finish, from one chair. That's Haven. Thank you."

---

## VERBATIM VOICE COMMANDS (rehearse these)
1. **"Show me a two-bedroom under sixteen hundred a month in Milpitas that's wheelchair accessible and takes Section 8."**
2. **"Walk me through the two-bedroom on Oak Street."**
3. **"Take me to the bookshelves."**
4. **"Show me the study desk."**
5. **"Show me the kitchen."**  ← *honesty beat — Haven says it's not part of the tour (expected, on purpose)*
6. **"Is this home good for someone using a wheelchair, and does it take Section 8?"**
7. **"Book a viewing for this Saturday afternoon."**  ← *fires the 3‑2‑1 countdown, then the live call*

**The tour only has these vantages:** *Overview · Bookshelves · Study Desk · Play Area.* (One honestly-captured room — there is no kitchen/living-room/bedroom to walk into; asking for one triggers the honesty line above.)
**Scene-proof fallback:** "turn around / look up / move closer / zoom in / next" work from any angle if a named vantage misses.

---

## ✅ PRE-FLIGHT (before you walk on)

- [ ] **Run on `localhost:3000`, not Vercel.** The live call needs the local `.env.local` secrets. `cd ~/Claude/projects/haven && npm run dev` → open `http://localhost:3000` in **Chrome**.
- [ ] **Point the call at Shivam's phone.** The call dials `DEMO_REALTOR_PHONE`, currently *Shaurya's* number. Set it to **Shivam's mobile** (E.164, `+1510…`) in `.env.local`, then **restart `npm run dev`**. *(Or just hand Shaurya's phone to Shivam.)*
- [ ] *(Optional)* set `NEXT_PUBLIC_DEMO_BUYER_NAME` to a buyer name; otherwise the agent says "a buyer / a Haven guest."
- [ ] **Twilio balance topped up.** Place **one test call backstage** with command #7 to confirm the agent connects.
- [ ] **Phone:** charged, **ringer ON, on speaker**, DND off, good signal, next to the laptop mic.
- [ ] **Pre-grant the mic:** load `/finder` once, click *Allow*. Pre-warm the tour once so the splat is cached.
- [ ] **Tabs:** Tab 1 `localhost:3000` · Tab 2 `/calls` · Tab 3 `/dashboard`.

## CONTINGENCY CARD
| If… | Do this |
|---|---|
| Mic won't catch a line | Type the exact line into the text box next to the mic — same engine. Keep talking. |
| Search returns nothing | Say **"Open the most affordable one"**, or click **Take a 3D tour** on the landing → goes straight to the tour. |
| Tour splat slow to load | Narrate the accessibility story over the loader; it pops in seconds. (You pre-warmed it.) |
| A named vantage misses | Fall back to relative commands: "turn around / look up / move closer / zoom in." |
| Phone doesn't ring | Booking still confirms on screen + logs to `/calls` & `/dashboard`. Say "on a flaky venue network it falls back to a simulated call — here's the transcript," cut to `/calls`. |
| Over time | Drop command #4 ("study desk") and tighten the close. |

## TIMING BUDGET
| Section | Window | Length |
|---|---|---|
| Pitch | 0:00–0:30 | 30s |
| Voice search | 0:30–1:15 | 45s |
| Tour + honesty + Q&A | 1:15–2:35 | 80s |
| **Live realtor call** | 2:35–4:05 | 90s |
| Calls + dashboard | 4:05–4:40 | 35s |
| Close | 4:40–5:00 | 20s |
| **Total** | | **5:00** |

## ONE-LINERS (for judges / Q&A)
- **What:** voice-first affordable-housing search + walkable 3D tour + an AI that calls the realtor to book the viewing.
- **Why:** the entire housing search becomes accessible to people who can't use a typical screen-and-mouse interface, can't travel to tour, or can't make the call themselves.
- **On the 3D room:** it's a real Gaussian-splat capture used as a representative accessible interior for the demo; Haven is honest that it covers one room and swaps in a per-unit capture for production.
- **Tech:** Next.js + Claude (search, navigation, home Q&A, command brain) · Gaussian-splat 3D · Web Speech voice I/O · ElevenLabs Conversational AI + Twilio for the autonomous realtor call · live activity dashboard.
- **Built by two people in a day.**

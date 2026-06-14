# Haven — Live Demo Script (2 presenters)

**Tagline:** *Find AND tour an affordable, accessible home — and book a viewing — using only your voice.*
**Length:** ~4 minutes. **Track:** Housing Dignity · Milpitas Hacks 3.

---

## Roles

- **A — Driver / Builder** (runs the laptop, speaks the voice commands, narrates *how* it works).
- **B — Storyteller / Realtor** (opens with the mission, narrates *why* it matters, and **answers the AI's phone call** as the realtor).

> The whole thing is voice-first, so **A holds the mic / speaks toward the laptop**. Keep the laptop audio on so the room hears Haven talk back.

---

## ✅ Pre-flight checklist (do this BEFORE you go up)

1. **Browser:** Chrome, on the demo laptop. **Allow the microphone** (tap the mic once, click *Allow*). Test "turn around" in a tour once.
2. **Run on localhost for the live call.** `cd ~/Claude/projects/haven && npm run dev` → `http://localhost:3000`. (localhost = mic works, splat loads instantly from disk, and the call creds in `.env.local` are live. The deployed Vercel link only places a *real* call if the Twilio/ElevenLabs env vars are added in Vercel — otherwise it simulates.)
3. **Pre-warm the tour:** open one tour once so the 58 MB scene is cached (first load shows the "Entering the home…" overlay).
4. **The phone:** set `DEMO_REALTOR_PHONE` in `.env.local` to **B's phone** (E.164, e.g. `+1510…`). Restart `npm run dev` after editing. Phone **charged, ringer ON, on speaker, good signal**, next to the laptop mic so the room hears both sides.
5. **Twilio balance:** top it up (it was low). One test call beforehand to confirm the agent connects.
6. **Tabs ready:** Tab 1 = `localhost:3000` (landing). Tab 2 = `localhost:3000/dashboard` (for the closing reveal).
7. **Fallback knowledge:** the **text box** next to the mic runs the exact same engine — if the mic acts up, type the line instead. If the call doesn't connect, the booking still confirms on screen (it simulates), so keep narrating.

---

## The script

### 0:00 — Hook (B)
> **B:** "Finding affordable, accessible housing is brutal — and every tool to do it assumes you can see a screen, use a mouse, and read pages of fine print. So people with mobility, vision, or hearing differences get left out of their own housing search. We built **Haven** to fix that. You find a home, walk through it, ask questions about it, and book a viewing — using *nothing but your voice.* Watch."

*[A is on the landing page. A clicks **Start searching**.]*

### 0:25 — Voice search (A)
> **A:** *(taps mic, speaks)* "**Show me a two-bedroom under sixteen hundred that's wheelchair accessible and takes Section 8.**"

*[Results animate in. Haven speaks a summary. A points at the match %.]*
> **A:** "Claude parsed that into a real filter — budget, beds, wheelchair access, Section 8 — and ranked these by how well they fit *that* request. Notice it's reading the summary back out loud."

> **B:** "Different question, different homes — ask for 'near BART' or 'a studio' and the whole list re-ranks. Let's walk into the top one."

### 0:55 — Enter the 3D tour (A)
*[A clicks the top card → **Walk this home**. The "Entering the home…" overlay, then a real, photorealistic room.]*
> **A:** "This is a real 3-D Gaussian-splat capture of the home — not a photo, a space you can move through."

### 1:10 — Explore by voice (A)
> **A:** *(mic)* "**Turn around.**" … "**Look up.**" … "**Move forward.**" … "**Zoom in.**" *(each one moves the camera)*
> **A:** *(glance at the room buttons in the top bar, say one of those exactly)* "**Take me to the [room name shown up top].**" — or just "**Next room.**"
> **A:** "Turn, look up, move closer, jump to a room — all by voice. Prefer a mouse? **Drag to look, scroll to zoom**, Street-View style." *[A drags once to show it.]*

> ⚠️ **Scene-proof rule:** the relative commands — *turn around, look up/down, move forward/back, zoom in/out* — work in **any** scene. For room jumps, **read the actual buttons in the top bar and say one of those** (don't hard-code "bookshelves"). The scene/labels may change between now and demo day.

> **B:** *(point to the glass panel, top-right)* "That floating panel is the listing at a glance — estimated value, rooms, square footage, the accessibility features, the agent."

### 1:45 — Ask the home anything (A) — the "smart AI"
> **A:** *(mic)* "**Is this place good for someone in a wheelchair, and does it take Section 8?**"

*[Haven answers out loud + on screen, grounded in the real listing — e.g. "Yes on both counts! Wide doors, grab bars, an elevator… and it accepts Section 8, HUD, and LIHTC."]*
> **A:** *(mic)* "**How much is rent and when was it built?**" *(it answers)*
> **A:** "Same voice bar — it knows when you're *navigating* versus *asking a question*, and answers from the real listing data."

### 2:20 — The showstopper: book a viewing by AI phone call (A → B)
> **A:** "Okay — we love it. Normally now you'd start cold-calling realtors. Watch this instead." *[A clicks **Book a viewing**, fills name + phone + 'This weekend', clicks **Request the viewing**.]*
> **A:** "An autonomous voice agent is calling the realtor… right now."

*[**B's phone rings.** B answers on speaker.]*
> **B:** *(as the realtor)* "Hello, this is the listing office."
> *[The ElevenLabs agent introduces itself, references the buyer's name + the address + the preferred time, and asks to schedule a viewing.]*
> **B:** *(as realtor, keep it short)* "Sure — how about Saturday at 2?" *[Agent confirms and thanks them; call wraps.]*

> **B:** "That was a real phone call — Twilio plus ElevenLabs — and it booked the viewing on its own, using this home's exact details. From a voice search to a booked tour, the person never touched a keyboard."

### 3:10 — Dashboard close (B, A switches tab)
*[A switches to Tab 2 — the **/dashboard** live feed, numbers counting up.]*
> **B:** "Everything we just did — the search, the walkthrough, the questions, the booking, the call — is streaming live here. That's the whole journey, hands-free."

> **A:** "Haven: find, tour, ask, and book an affordable home using only your voice. Built for Housing Dignity — because searching for a home should be accessible to everyone."

*[End. ~3:30.]*

---

## If something breaks (stay calm, keep moving)

| If… | Do this |
|---|---|
| Mic doesn't pick up | **Type** the exact line into the box next to the mic — same engine, instant. |
| Tour is slow to load | Keep talking over the "Entering the home…" spinner; it's the 58 MB real scene. (You pre-warmed it, so it should be instant.) |
| The phone doesn't ring | The booking **still confirms on screen** and the dashboard logs it — say "the agent is placing the call now" and move to the dashboard. (It simulates when offline.) |
| A voice answer is off | Re-ask once, or read the on-screen answer card aloud. |
| Deployed link misbehaves | Fall back to localhost (Tab kept open). |

---

## One-line versions (for Q&A / judges)

- **What it is:** voice-first affordable-housing search + walkable 3-D tour + AI that calls the realtor to book the viewing.
- **Why it matters:** the entire housing search becomes accessible to people who can't use a typical screen/mouse interface.
- **The tech:** Next.js + Claude (search, navigation, and the home Q&A) · Spark Gaussian-splat 3-D · Web Speech voice in/out · ElevenLabs Conversational AI + Twilio for the autonomous realtor call · live activity dashboard.
- **Built by two people in a day.**

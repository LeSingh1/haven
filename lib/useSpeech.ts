// lib/useSpeech.ts — natural TTS via browser speechSynthesis
'use client';

/**
 * Voice-quality layer for Haven (accessibility-first).
 * - Picks the best available English voice per browser (Chrome "Google US English"
 *   / online "Natural" voices, Edge neural "...Online (Natural)", Safari "Samantha"
 *   / Enhanced & Premium voices).
 * - Tunes rate & pitch for a warm, clear, friendly delivery (clarity first).
 * - Handles the async `voiceschanged` load, caches the chosen voice, never throws,
 *   no SSR access.
 *
 * Public API unchanged: speak(text) and cancelSpeech().
 */

const RATE = 0.96; // slightly under natural speed for clarity
const PITCH = 1.05; // a touch above default reads warm/friendly, not flat
const VOLUME = 1;

// Ordered, lowercased; earlier = strongly preferred. Substring-matched against
// voice.name, so 'natural' catches every "...Online (Natural)" neural variant, etc.
const PREFERRED = [
  'google us english',
  'microsoft ava online (natural)',
  'microsoft emma online (natural)',
  'microsoft aria online (natural)',
  'microsoft jenny online (natural)',
  'microsoft guy online (natural)',
  'natural',
  'samantha',
  'ava (premium)',
  'ava (enhanced)',
  'ava',
  'allison',
  'evan (enhanced)',
  'zoe (premium)',
  'nicky',
  'enhanced',
  'premium',
  'google uk english female',
];

// Novelty / low-fidelity voices — penalized so they only win as a last resort.
const LOW_QUALITY = /compact|espeak|albert|zarvox|bubbles|cellos|jester|organ|trinoids|whisper|wobble|novelty|bad news|good news/;

let cachedVoice: SpeechSynthesisVoice | null = null;
let resolvedOnce = false; // true once we resolved against a non-empty voice list
let listenerAttached = false;

// True while the app is talking, so continuous voice input can ignore the TTS and
// not hear its own answers as new commands (prevents a feedback loop).
let _speaking = false;
export function isSpeaking(): boolean {
  return _speaking;
}

function getSynth(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  try {
    return 'speechSynthesis' in window ? window.speechSynthesis : null;
  } catch {
    return null;
  }
}

function score(v: SpeechSynthesisVoice): number {
  const name = (v.name || '').toLowerCase();
  const lang = (v.lang || '').toLowerCase();
  let s = 0;
  for (let i = 0; i < PREFERRED.length; i++) {
    if (name.includes(PREFERRED[i])) {
      s += (PREFERRED.length - i) * 10;
      break; // only credit the strongest (earliest) match
    }
  }
  if (/natural|neural|enhanced|premium/.test(name)) s += 25;
  if (v.localService === false) s += 8; // cloud/neural voices read more naturally
  if (lang === 'en-us') s += 6;
  else if (lang.startsWith('en')) s += 3;
  if (v.default) s += 1; // mild tiebreak toward platform default
  if (LOW_QUALITY.test(name)) s -= 50;
  return s;
}

function pickBest(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const en = voices.filter((v) => (v.lang || '').toLowerCase().startsWith('en'));
  if (!en.length) return null;
  let best: SpeechSynthesisVoice | null = null;
  let hi = -Infinity;
  for (const v of en) {
    const sc = score(v);
    if (sc > hi) {
      hi = sc;
      best = v;
    }
  }
  // Deliberate fallback: prefer en-US, then any en, then null (browser default).
  return best || en.find((v) => (v.lang || '').toLowerCase() === 'en-us') || en[0] || null;
}

function resolveVoice(): void {
  const synth = getSynth();
  if (!synth) return;
  // Attach the async-load listener exactly once.
  if (!listenerAttached) {
    try {
      if (typeof synth.addEventListener === 'function') {
        synth.addEventListener('voiceschanged', resolveVoice);
      } else {
        // Some Safari builds only expose the property form.
        synth.onvoiceschanged = resolveVoice;
      }
      listenerAttached = true;
    } catch {
      /* still resolved lazily inside speak() */
    }
  }
  try {
    const voices = synth.getVoices();
    if (!voices || !voices.length) return; // not loaded yet
    const best = pickBest(voices);
    if (best) {
      cachedVoice = best;
      resolvedOnce = true;
    }
  } catch {
    /* keep prior cache */
  }
}

// Best-effort warm-up at import time (client only); safe if voices aren't ready yet.
if (typeof window !== 'undefined') resolveVoice();

/**
 * Speaks text aloud with the best available natural voice.
 * Cancels any in-progress utterance first so speech never stacks.
 * Cap long strings before calling — speak() the count + top 3, then
 * "say more to hear the rest."
 */
export function speak(text: string): void {
  if (!text) return;
  const synth = getSynth();
  if (!synth) return;
  try {
    synth.cancel(); // never let utterances stack
    if (!resolvedOnce || !cachedVoice) resolveVoice();

    const u = new SpeechSynthesisUtterance(text);
    if (cachedVoice) {
      u.voice = cachedVoice;
      u.lang = cachedVoice.lang || 'en-US';
    } else {
      u.lang = 'en-US'; // browser default voice, still pinned to English
    }
    u.rate = RATE;
    u.pitch = PITCH;
    u.volume = VOLUME;

    // Mark "speaking" so continuous voice input ignores our own audio. The flag
    // clears when the utterance ends/errors (or on cancel).
    _speaking = true;
    u.onstart = () => { _speaking = true; };
    u.onend = () => { _speaking = false; };
    u.onerror = () => { _speaking = false; };

    // Chrome can stall TTS right after a cancel(); resume defensively.
    try {
      if (synth.paused) synth.resume();
    } catch {
      /* noop */
    }

    synth.speak(u);
  } catch {
    _speaking = false;
    /* never throw to callers — voice is an enhancement, not a hard dependency */
  }
}

export function cancelSpeech(): void {
  _speaking = false;
  const synth = getSynth();
  if (!synth) return;
  try {
    synth.cancel();
  } catch {
    /* noop */
  }
}

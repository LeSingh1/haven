// lib/useSpeech.ts — TTS output via browser speechSynthesis
'use client';

/**
 * Speaks text aloud. Cancels any in-progress utterance first so speech never stacks.
 * Cap long strings before calling — speak() the count + top 3, then "say more to hear the rest."
 */
export function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.95; // slightly slower for clarity
  window.speechSynthesis.speak(u);
}

export function cancelSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

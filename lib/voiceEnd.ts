// lib/voiceEnd.ts — detect when the user wants to END hands-free voice mode.
// Used so continuous listening only stops on an explicit "stop"/"end" (or a mic tap).
export function isEndPhrase(t: string): boolean {
  const s = ` ${t.toLowerCase().replace(/[^a-z'\s]/g, ' ').replace(/\s+/g, ' ').trim()} `;
  return (
    /\b(stop listening|stop the mic|stop the call|end (the )?(call|chat|session|tour|conversation)|hang up|i'?m done|i am done|that'?s all|that is all|that'?s it|never ?mind|turn off the mic|stop now|please stop)\b/.test(s) ||
    /^\s*(stop|end|done|cancel|quiet|exit)\s*$/.test(s)
  );
}

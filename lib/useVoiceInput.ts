// lib/useVoiceInput.ts — push-to-talk voice input via Web Speech API
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { isSpeaking, spokenText, cancelSpeech } from './useSpeech';

// Maps Web Speech API error codes to plain, actionable guidance for the user.
// Without this, a blocked mic fails silently — the user taps "speak" and nothing
// happens, with no idea why. Returns null for transient codes we shouldn't surface.
function voiceErrorMessage(code: string): string | null {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return "Microphone access is blocked. Click the lock/camera icon in your browser's address bar, allow the microphone, then tap to speak again — or just type your search below.";
    case 'audio-capture':
      return 'No microphone was found. Plug one in or type your search below.';
    case 'network':
      return 'Voice recognition needs a connection and works best in Chrome. Type your search below if it keeps failing.';
    case 'no-speech':
    case 'aborted':
      return null; // transient — Chrome restarts on its own; don't nag the user
    default:
      return 'Voice input ran into a problem. Try again, or type your search below.';
  }
}

export function useVoiceInput(onTranscript: (t: string) => void) {
  const recRef = useRef<SpeechRecognition | null>(null);
  const wantRef = useRef(false); // ref so onend closure sees current value
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const Ctor =
      typeof window !== 'undefined'
        ? window.SpeechRecognition ?? window.webkitSpeechRecognition
        : undefined;
    if (!Ctor) {
      console.warn('SpeechRecognition unsupported — text fallback is active');
      return;
    }
    const r = new Ctor();
    r.lang = 'en-US';
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onresult = (e: SpeechRecognitionEvent) => {
      let fin = '',
        itm = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        res.isFinal ? (fin += res[0].transcript) : (itm += res[0].transcript);
      }
      const speaking = isSpeaking();
      if (fin.trim()) {
        setInterim('');
        const f = fin.trim();
        // While we're talking, our own TTS can leak into an open mic. If the
        // recognized text is just a slice of what we're currently saying, it's that
        // echo — ignore it. Anything else means the user is barging in over us, so
        // stop talking and act on it. This is what makes a quick "show me the 3D
        // tour" work even while Haven is still reading the results aloud.
        if (speaking) {
          if (spokenText().includes(f.toLowerCase())) return;
          cancelSpeech();
        }
        onTranscript(f);
      } else if (speaking) {
        // We're still talking and the mic also hears our own TTS. If the interim is
        // just a slice of what we're saying, it's that echo — hide it. Anything else
        // means the user started talking over us: cut our speech IMMEDIATELY (on the
        // interim, before they even finish the sentence) so they take over at once.
        const itmLower = itm.trim().toLowerCase();
        if (itmLower && !spokenText().includes(itmLower)) {
          cancelSpeech();
          setInterim(itm);
        } else {
          setInterim('');
        }
      } else {
        setInterim(itm);
      }
    };

    r.onerror = (e: SpeechRecognitionErrorEvent) => {
      const msg = voiceErrorMessage(e.error);
      if (msg) setError(msg);
      // Fatal errors won't recover on a restart — stop wanting to listen so the
      // onend handler doesn't loop, and drop out of the listening state.
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') {
        wantRef.current = false;
        setListening(false);
      }
    };

    // Chrome stops recognition automatically — restart if user still wants it.
    r.onend = () => {
      if (wantRef.current) {
        try {
          r.start();
        } catch {}
      } else {
        setListening(false);
      }
    };

    recRef.current = r;
    return () => {
      wantRef.current = false;
      r.abort();
    };
  }, [onTranscript]);

  const start = useCallback(() => {
    setError(null);
    wantRef.current = true;
    setListening(true);
    try {
      recRef.current?.start();
    } catch {}
  }, []);

  const stop = useCallback(() => {
    wantRef.current = false;
    setListening(false);
    recRef.current?.stop();
  }, []);

  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(!!(window.SpeechRecognition ?? window.webkitSpeechRecognition));
  }, []);

  return { listening, interim, start, stop, supported, error };
}

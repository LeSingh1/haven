// lib/useVoiceInput.ts — push-to-talk voice input via Web Speech API
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

export function useVoiceInput(onTranscript: (t: string) => void) {
  const recRef = useRef<SpeechRecognition | null>(null);
  const wantRef = useRef(false); // ref so onend closure sees current value
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');

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
      setInterim(itm);
      if (fin.trim()) {
        setInterim('');
        onTranscript(fin.trim());
      }
    };

    r.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === 'not-allowed') {
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

  return { listening, interim, start, stop, supported };
}

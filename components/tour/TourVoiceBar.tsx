'use client';
import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import type { VoiceStatus } from '@/lib/types';
import { useVoiceInput } from '@/lib/useVoiceInput';
import { isSpeaking, speak } from '@/lib/useSpeech';
import { isEndPhrase } from '@/lib/voiceEnd';
import { EASE_OUT } from '@/lib/motion';
import MicButton from '@/components/finder/MicButton';

interface TourVoiceBarProps {
  onSpeech: (transcript: string) => void;
  externalStatus?: VoiceStatus;
}

export default function TourVoiceBar({ onSpeech, externalStatus }: TourVoiceBarProps) {
  const [textInput, setTextInput] = useState('');

  // Conversation mode: once started, the mic keeps listening through many commands
  // and questions. It stops only when the user taps the mic or says "stop"/"end".
  const handleTranscriptRef = useRef<(t: string) => void>(null!);
  handleTranscriptRef.current = (t: string) => {
    if (isSpeaking()) return; // ignore our own spoken answers — prevents a feedback loop
    if (isEndPhrase(t)) {
      stop();
      speak("Okay, I'll stop listening. Tap the mic when you want me back.");
      return;
    }
    onSpeech(t); // act on it and KEEP listening
  };

  const stableHandler = useCallback((t: string) => handleTranscriptRef.current(t), []);
  const { listening, interim, start, stop, supported } = useVoiceInput(stableHandler);

  // Mic shows "Listening…" continuously between commands; thinking/speaking briefly override.
  const displayStatus: VoiceStatus =
    externalStatus === 'thinking' || externalStatus === 'speaking'
      ? externalStatus
      : listening
        ? 'listening'
        : 'idle';

  const handleStart = useCallback(() => start(), [start]);
  const handleStop = useCallback(() => stop(), [stop]);

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = textInput.trim();
    if (!q) return;
    setTextInput('');
    onSpeech(q);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.15 }}
      className="glass-strong fixed inset-x-3 bottom-3 z-30 rounded-2xl border-white/10 px-4 py-3 shadow-[0_-10px_40px_-10px_rgba(34,211,238,0.25)] sm:inset-x-6 sm:bottom-6 sm:px-6 sm:py-4"
    >
      {/* Interim transcript */}
      {interim && (
        <div
          aria-live="polite"
          className="mb-3 inline-block rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs italic text-accent"
        >
          {interim}…
        </div>
      )}

      <div className="flex items-center gap-4">
        <MicButton status={displayStatus} onStart={handleStart} onStop={handleStop} supported={supported} />

        {/* Text twin */}
        <form onSubmit={handleTextSubmit} className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="tour-text" className="text-[10px] font-medium uppercase tracking-wider text-textdim">
            Navigate by typing
          </label>
          <div className="flex gap-2">
            <input
              id="tour-text"
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder='Navigate or ask — e.g. "go to the desk" or "how much is rent?"'
              className={[
                'flex-1 min-h-[48px] rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text',
                'placeholder:text-textdim/70 transition-colors',
                'focus:border-accent focus:bg-white/[0.05] focus:outline-none',
              ].join(' ')}
              disabled={displayStatus === 'thinking'}
            />
            <button
              type="submit"
              disabled={displayStatus === 'thinking' || !textInput.trim()}
              className="btn-neon min-h-[48px] rounded-xl px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              Go
            </button>
          </div>
        </form>
      </div>

      {supported && (
        <p className="mt-3 text-center text-[11px] leading-relaxed text-textdim/80">
          Navigate: <span className="text-accent">&ldquo;go to the desk&rdquo;</span>,{' '}
          <span className="text-accent">&ldquo;turn around&rdquo;</span>,{' '}
          <span className="text-accent">&ldquo;zoom in&rdquo;</span>{' '}· Ask:{' '}
          <span className="text-accent">&ldquo;how much is rent?&rdquo;</span>,{' '}
          <span className="text-accent">&ldquo;is it wheelchair accessible?&rdquo;</span>,{' '}
          <span className="text-accent">&ldquo;when was it built?&rdquo;</span>
          <br />
          <span className="text-textdim/60">
            Tap the mic once, then keep talking — say <span className="text-accent">&ldquo;stop&rdquo;</span> or tap again to end.
          </span>
        </p>
      )}
    </motion.div>
  );
}

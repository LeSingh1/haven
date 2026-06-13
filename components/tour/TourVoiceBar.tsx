'use client';
import { useState, useCallback, useRef } from 'react';
import type { VoiceStatus } from '@/lib/types';
import { useVoiceInput } from '@/lib/useVoiceInput';
import MicButton from '@/components/finder/MicButton';

interface TourVoiceBarProps {
  onSpeech: (transcript: string) => void;
  externalStatus?: VoiceStatus;
}

export default function TourVoiceBar({ onSpeech, externalStatus }: TourVoiceBarProps) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [textInput, setTextInput] = useState('');

  const handleTranscriptRef = useRef<(t: string) => void>(null!);
  handleTranscriptRef.current = (t: string) => {
    stop();
    setStatus('idle');
    onSpeech(t);
  };

  const stableHandler = useCallback((t: string) => handleTranscriptRef.current(t), []);
  const { listening, interim, start, stop, supported } = useVoiceInput(stableHandler);

  const displayStatus = externalStatus ?? status;

  const handleStart = useCallback(() => {
    setStatus('listening');
    start();
  }, [start]);

  const handleStop = useCallback(() => {
    setStatus('idle');
    stop();
  }, [stop]);

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = textInput.trim();
    if (!q) return;
    setTextInput('');
    onSpeech(q);
  }

  return (
    <div className="glass-strong fixed inset-x-3 bottom-3 z-30 rounded-2xl border-white/10 px-4 py-3 shadow-[0_-10px_40px_-10px_rgba(34,211,238,0.25)] sm:inset-x-6 sm:bottom-6 sm:px-6 sm:py-4">
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
              placeholder='e.g. "living room" or "next"'
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
        <p className="mt-3 text-center text-[11px] text-textdim/80">
          Say: <span className="text-accent">"entrance"</span>,{' '}
          <span className="text-accent">"living room"</span>,{' '}
          <span className="text-accent">"kitchen"</span>,{' '}
          <span className="text-accent">"bedroom"</span>,{' '}
          <span className="text-accent">"next"</span>,{' '}
          <span className="text-accent">"back"</span>, or{' '}
          <span className="text-accent">"reset"</span>
        </p>
      )}
    </div>
  );
}

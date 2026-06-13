'use client';
import { useState, useCallback, useRef } from 'react';
import type { VoiceStatus } from '@/lib/types';
import { useVoiceInput } from '@/lib/useVoiceInput';
import MicButton from '@/components/finder/MicButton';

interface TourVoiceBarProps {
  onSpeech: (transcript: string) => void;
  /** Lifted from parent so parent can show feedback state */
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
    <aside
      aria-label="Tour voice controls"
      className="fixed bottom-0 inset-x-0 bg-surface/95 backdrop-blur border-t border-line px-4 py-4 flex flex-col items-center gap-3 z-50"
    >
      {/* Interim transcript */}
      {interim && (
        <p aria-live="polite" className="text-sm text-textdim italic">
          {interim}…
        </p>
      )}

      <div className="flex items-center gap-4 w-full max-w-lg">
        <MicButton
          status={displayStatus}
          onStart={handleStart}
          onStop={handleStop}
          supported={supported}
        />

        {/* Text twin — so a noisy room never kills the demo */}
        <form
          onSubmit={handleTextSubmit}
          className="flex-1 flex gap-2"
          aria-label="Type a navigation command"
        >
          <label htmlFor="tour-text" className="sr-only">Navigate by typing</label>
          <input
            id="tour-text"
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder='e.g. "living room" or "next"'
            className={[
              'flex-1 bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-text',
              'placeholder-textdim focus:border-accent focus:outline-none transition-colors',
              'min-h-[48px]',
            ].join(' ')}
            disabled={displayStatus === 'thinking'}
          />
          <button
            type="submit"
            disabled={displayStatus === 'thinking' || !textInput.trim()}
            className={[
              'px-4 py-2 rounded-lg bg-accent text-bg text-sm font-semibold',
              'hover:bg-accent/90 disabled:opacity-50 transition-colors min-h-[48px]',
            ].join(' ')}
          >
            Go
          </button>
        </form>
      </div>

      {supported && (
        <p className="text-xs text-textdim">
          Say: "entrance", "living room", "kitchen", "bedroom", "next", "back", or "reset"
        </p>
      )}
    </aside>
  );
}

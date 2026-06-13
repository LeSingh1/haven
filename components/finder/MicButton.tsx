'use client';
import type { VoiceStatus } from '@/lib/types';

interface MicButtonProps {
  status: VoiceStatus;
  onStart: () => void;
  onStop: () => void;
  supported: boolean;
}

const statusLabel: Record<VoiceStatus, string> = {
  idle: 'Tap to speak',
  listening: 'Listening… tap to stop',
  thinking: 'Searching…',
  speaking: 'Speaking…',
};

const statusClasses: Record<VoiceStatus, string> = {
  idle:
    'bg-white/[0.04] border-white/15 text-text hover:border-accent/60 hover:bg-accent/10 hover:scale-[1.04] hover:shadow-[0_0_40px_-8px_rgba(34,211,238,0.6)] cursor-pointer backdrop-blur-xl',
  listening:
    'bg-accent/15 border-accent text-accent mic-pulse cursor-pointer backdrop-blur-xl',
  thinking:
    'bg-white/[0.03] border-warn/60 text-warn cursor-not-allowed backdrop-blur-xl shadow-[0_0_30px_-8px_rgba(251,191,36,0.5)]',
  speaking:
    'bg-white/[0.03] border-good/60 text-good cursor-not-allowed backdrop-blur-xl shadow-[0_0_30px_-8px_rgba(74,222,128,0.5)]',
};

export default function MicButton({ status, onStart, onStop, supported }: MicButtonProps) {
  const isListening = status === 'listening';
  const isDisabled = status === 'thinking' || status === 'speaking';

  function handleClick() {
    if (isDisabled) return;
    isListening ? onStop() : onStart();
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled || !supported}
        aria-label={statusLabel[status]}
        aria-pressed={isListening}
        className={[
          'relative grid place-items-center',
          'h-20 w-20 rounded-full border-2 transition-all duration-200',
          'disabled:opacity-60',
          statusClasses[status],
        ].join(' ')}
      >
        <MicIcon active={isListening} status={status} />
      </button>

      {!supported && (
        <p className="max-w-xs text-center text-xs text-textdim">
          Voice not available in this browser. Use the text box below.
        </p>
      )}

      <p
        aria-live="polite"
        className="text-sm font-medium tracking-wide text-textdim"
      >
        {statusLabel[status]}
      </p>
    </div>
  );
}

function MicIcon({ active, status }: { active: boolean; status: VoiceStatus }) {
  if (status === 'thinking') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="spin-slow" aria-hidden>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    );
  }
  if (status === 'speaking') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    );
  }
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3" />
    </svg>
  );
}

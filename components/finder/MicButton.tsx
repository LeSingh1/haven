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

const statusColor: Record<VoiceStatus, string> = {
  idle: 'bg-surface2 hover:bg-line border-line',
  listening: 'bg-accent/10 border-accent mic-pulse',
  thinking: 'bg-surface2 border-warn',
  speaking: 'bg-surface2 border-good',
};

export default function MicButton({ status, onStart, onStop, supported }: MicButtonProps) {
  const isListening = status === 'listening';
  const isDisabled = status === 'thinking' || status === 'speaking';

  function handleClick() {
    if (isDisabled) return;
    isListening ? onStop() : onStart();
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleClick}
        disabled={isDisabled}
        aria-pressed={isListening}
        aria-label={isListening ? 'Stop listening' : 'Start listening'}
        className={[
          'w-20 h-20 rounded-full border-2 transition-colors duration-200',
          'flex items-center justify-center',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          statusColor[status],
        ].join(' ')}
      >
        <MicIcon active={isListening} status={status} />
      </button>

      {!supported && (
        <p role="alert" className="text-xs text-warn text-center max-w-[200px]">
          Voice not available in this browser. Use the text box below.
        </p>
      )}

      <span
        aria-live="polite"
        aria-atomic="true"
        className="text-sm text-textdim min-h-[1.25rem]"
      >
        {statusLabel[status]}
      </span>
    </div>
  );
}

function MicIcon({ active, status }: { active: boolean; status: VoiceStatus }) {
  if (status === 'thinking') {
    return (
      <svg className="w-8 h-8 text-warn animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    );
  }
  if (status === 'speaking') {
    return (
      <svg className="w-8 h-8 text-good" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M11 5 6 9H2v6h4l5 4V5z" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    );
  }
  return (
    <svg
      className={`w-8 h-8 ${active ? 'text-accent' : 'text-textdim'}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 19v3M8 22h8" />
    </svg>
  );
}

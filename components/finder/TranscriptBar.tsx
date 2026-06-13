'use client';

interface TranscriptBarProps {
  transcript: string; // last confirmed utterance
  interim: string;    // partial in-progress text
}

export default function TranscriptBar({ transcript, interim }: TranscriptBarProps) {
  const display = interim || transcript;
  if (!display) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      role="status"
      className="w-full max-w-xl mx-auto px-4 py-2 rounded-lg bg-surface border border-line text-sm"
    >
      {interim ? (
        <span className="text-textdim italic">{interim}…</span>
      ) : (
        <span className="text-text">{transcript}</span>
      )}
    </div>
  );
}

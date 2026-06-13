'use client';
import { useEffect } from 'react';
import { speak } from '@/lib/useSpeech';

interface SpokenSummaryProps {
  summary: string;
  version: number; // increment to retrigger speech on the same summary
}

export default function SpokenSummary({ summary, version }: SpokenSummaryProps) {
  // Speaks the summary whenever it changes (new search results land).
  useEffect(() => {
    if (summary) speak(summary);
  }, [summary, version]); // version dep forces re-speak if same summary returned twice

  if (!summary) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      role="status"
      className="w-full max-w-xl mx-auto px-4 py-3 rounded-lg bg-surface border border-line text-sm text-text leading-relaxed"
    >
      <span className="text-accent font-semibold mr-2">Haven says:</span>
      {summary}
    </div>
  );
}

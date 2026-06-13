'use client';
import { useState, useCallback, useRef } from 'react';
import type { Listing, VoiceStatus } from '@/lib/types';
import { search } from '@/lib/api';
import { useVoiceInput } from '@/lib/useVoiceInput';
import MicButton from './MicButton';
import TranscriptBar from './TranscriptBar';
import ResultsList from './ResultsList';
import SpokenSummary from './SpokenSummary';

export default function FinderShell() {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState('');
  const [summaryVersion, setSummaryVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Stable reference so useVoiceInput's useEffect doesn't re-run.
  const handleTranscriptRef = useRef<(t: string) => void>(null!);

  const runSearch = useCallback(async (query: string) => {
    setTranscript(query);
    setStatus('thinking');
    setLoading(true);
    setErrorMsg('');

    const result = await search({ transcript: query });

    setLoading(false);

    if (!result.ok) {
      setErrorMsg(result.spokenFallback);
      setSummary(result.spokenFallback);
      setSummaryVersion((v) => v + 1);
      setStatus('speaking');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    setListings(result.listings);
    setTotalCount(result.totalCount);
    setSummary(result.spokenSummary);
    setSummaryVersion((v) => v + 1);
    setStatus('speaking');
    // Return to idle after TTS has time to play (rough estimate).
    const est = result.spokenSummary.length * 55; // ~55 ms per char at normal rate
    setTimeout(() => setStatus('idle'), Math.min(Math.max(est, 2000), 12000));
  }, []);

  handleTranscriptRef.current = (t: string) => {
    runSearch(t);
  };

  const stableHandler = useCallback((t: string) => handleTranscriptRef.current(t), []);

  const { listening, interim, start, stop, supported } = useVoiceInput(stableHandler);

  // Sync listening state into our VoiceStatus
  const handleStart = useCallback(() => {
    setStatus('listening');
    start();
  }, [start]);

  const handleStop = useCallback(() => {
    if (status === 'listening') setStatus('idle');
    stop();
  }, [stop, status]);

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = textInput.trim();
    if (!q) return;
    setTextInput('');
    runSearch(q);
  }

  return (
    <main className="min-h-screen bg-bg text-text flex flex-col items-center px-4 py-10 gap-8">
      {/* Page heading */}
      <header className="text-center max-w-xl">
        <h1 className="text-3xl font-bold tracking-tight text-text">
          Find your home<span className="text-accent">.</span>
        </h1>
        <p className="mt-2 text-textdim">
          Speak or type — Haven finds affordable, accessible housing near you.
        </p>
      </header>

      {/* Voice input area */}
      <div className="flex flex-col items-center gap-4 w-full max-w-xl">
        <MicButton
          status={status}
          onStart={handleStart}
          onStop={handleStop}
          supported={supported}
        />

        <TranscriptBar
          transcript={transcript}
          interim={interim}
        />

        {/* Text fallback — always visible */}
        <form
          onSubmit={handleTextSubmit}
          className="w-full flex gap-2"
          aria-label="Text search"
        >
          <label htmlFor="text-query" className="sr-only">Search by typing</label>
          <input
            id="text-query"
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="e.g. 2 bedroom under $1500 wheelchair accessible"
            className={[
              'flex-1 bg-surface border border-line rounded-lg px-4 py-3 text-sm text-text',
              'placeholder-textdim focus:border-accent focus:outline-none transition-colors',
              'min-h-[48px]',
            ].join(' ')}
            aria-label="Describe the home you're looking for"
            disabled={status === 'thinking'}
          />
          <button
            type="submit"
            disabled={status === 'thinking' || !textInput.trim()}
            className={[
              'px-4 py-3 rounded-lg bg-accent text-bg text-sm font-semibold',
              'hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors min-h-[48px] min-w-[64px]',
            ].join(' ')}
            aria-label="Search"
          >
            Search
          </button>
        </form>
      </div>

      {/* Error message */}
      {errorMsg && (
        <p role="alert" aria-live="assertive" className="text-bad text-sm text-center max-w-xl">
          {errorMsg}
        </p>
      )}

      {/* Spoken summary */}
      <div className="w-full max-w-xl">
        <SpokenSummary summary={summary} version={summaryVersion} />
      </div>

      {/* Results */}
      <div className="w-full max-w-xl">
        <ResultsList listings={listings} totalCount={totalCount} loading={loading} />
      </div>
    </main>
  );
}

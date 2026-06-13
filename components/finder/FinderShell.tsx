'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { Listing, VoiceStatus } from '@/lib/types';
import { search } from '@/lib/api';
import { useVoiceInput } from '@/lib/useVoiceInput';
import { cancelSpeech } from '@/lib/useSpeech';
import MicButton from './MicButton';
import TranscriptBar from './TranscriptBar';
import ResultsList from './ResultsList';
import SpokenSummary from './SpokenSummary';

const SUGGESTED_QUERIES = [
  '2 bedroom under $1,400',
  'wheelchair accessible in Milpitas',
  'studio under $1,000',
  'Section 8 3 bedroom',
  '1 bedroom elevator near BART',
];

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

  const cancelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (query: string) => {
    cancelSpeech();
    if (cancelTimeoutRef.current) clearTimeout(cancelTimeoutRef.current);

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
      cancelTimeoutRef.current = setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    setListings(result.listings);
    setTotalCount(result.totalCount);
    setSummary(result.spokenSummary);
    setSummaryVersion((v) => v + 1);
    setStatus('speaking');

    const est = result.spokenSummary.length * 55;
    cancelTimeoutRef.current = setTimeout(
      () => setStatus('idle'),
      Math.min(Math.max(est, 2000), 12000)
    );
  }, []);

  useEffect(() => () => { if (cancelTimeoutRef.current) clearTimeout(cancelTimeoutRef.current); }, []);

  const runSearchRef = useRef(runSearch);
  useEffect(() => { runSearchRef.current = runSearch; }, [runSearch]);
  const stableHandler = useCallback((t: string) => runSearchRef.current(t), []);

  const { listening, interim, start, stop, supported, error: voiceError } = useVoiceInput(stableHandler);

  useEffect(() => {
    if (listening && status !== 'listening') setStatus('listening');
  }, [listening, status]);

  // Unstick the mic when recognition ends on its own (e.g. permission denied):
  // otherwise the button stays on "Listening…" forever with nothing happening.
  useEffect(() => {
    if (!listening) setStatus((p) => (p === 'listening' ? 'idle' : p));
  }, [listening]);

  const handleStart = useCallback(() => {
    cancelSpeech();
    if (cancelTimeoutRef.current) clearTimeout(cancelTimeoutRef.current);
    setStatus('listening');
    start();
  }, [start]);

  const handleStop = useCallback(() => {
    stop();
    setStatus((prev) => (prev === 'listening' ? 'idle' : prev));
  }, [stop]);

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = textInput.trim();
    if (!q) return;
    setTextInput('');
    runSearch(q);
  }

  function handleSuggestion(q: string) {
    setTextInput(q);
    runSearch(q);
  }

  const showSuggestions = !loading && listings.length === 0 && !transcript;

  return (
    <main className="relative mx-auto max-w-3xl px-5 pt-12 pb-32 sm:pt-16">
      {/* Page heading */}
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-text sm:text-5xl">
          Find your <span className="accent-shine">home</span>.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-textdim sm:text-base">
          Speak or type — Haven finds affordable, accessible housing near you.
        </p>
      </header>

      {/* Voice input card */}
      <section className="glass relative rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6">
          <MicButton status={status} onStart={handleStart} onStop={handleStop} supported={supported} />
          <TranscriptBar interim={interim} transcript={transcript} />
          {voiceError && (
            <p
              role="alert"
              className="max-w-md rounded-xl border border-warn/40 bg-warn/10 px-4 py-2.5 text-center text-xs text-warn backdrop-blur-md"
            >
              {voiceError}
            </p>
          )}
        </div>

        {/* Text fallback */}
        <form onSubmit={handleTextSubmit} className="mt-6 flex flex-col gap-2">
          <label htmlFor="finder-text" className="text-xs font-medium uppercase tracking-wider text-textdim">
            Search by typing
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="finder-text"
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="e.g. 2 bedroom under $1,500 wheelchair accessible"
              className={[
                'flex-1 min-h-[48px] rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text',
                'placeholder:text-textdim/70 transition-colors',
                'focus:border-accent focus:bg-white/[0.05] focus:outline-none',
              ].join(' ')}
              aria-label="Describe the home you're looking for"
              disabled={status === 'thinking'}
            />
            <button
              type="submit"
              disabled={status === 'thinking' || !textInput.trim()}
              className="btn-neon min-h-[48px] rounded-xl px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              Search
            </button>
          </div>
        </form>

        {/* Suggested queries */}
        {showSuggestions && (
          <div className="mt-6 border-t border-white/5 pt-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-textdim">
              Try asking:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUERIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSuggestion(q)}
                  className={[
                    'min-h-[36px] rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5',
                    'text-xs text-textdim backdrop-blur-md cursor-pointer',
                    'transition-all hover:border-accent/50 hover:text-text hover:bg-accent/5',
                    'hover:shadow-[0_0_20px_-6px_rgba(34,211,238,0.5)]',
                  ].join(' ')}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Error message */}
      {errorMsg && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-bad backdrop-blur-md"
        >
          {errorMsg}
        </div>
      )}

      {/* Spoken summary */}
      <div className="mt-6">
        <SpokenSummary summary={summary} version={summaryVersion} />
      </div>

      {/* Results */}
      <div className="mt-8">
        <ResultsList listings={listings} totalCount={totalCount} loading={loading} />
      </div>
    </main>
  );
}

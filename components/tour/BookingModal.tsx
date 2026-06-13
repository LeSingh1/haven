'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { speak } from '@/lib/useSpeech';
import { track } from '@/lib/track';
import { EASE_OUT } from '@/lib/motion';

interface Props {
  listingId: string;
  address: string;
  realtorName: string;
  realtorPhone: string;
  onClose: () => void;
}

const TIMES = ['This weekend', 'Weekday evening', 'Tomorrow', 'Flexible'];

export default function BookingModal({ listingId, address, realtorName, realtorPhone, onClose }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [time, setTime] = useState('Flexible');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ confirmation: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, address, name, phone, preferredTime: time, message, realtorName, realtorPhone }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.message || 'Something went wrong.'); setBusy(false); return; }
      track('appointment', `Booked a viewing of ${address}`, { listingId });
      if (data.spoken) speak(data.spoken);
      setDone({ confirmation: data.confirmation });
    } catch {
      setError('Network error — please try again.');
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* scrim */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
        role="dialog" aria-modal="true" aria-label="Book a viewing"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/15 shadow-2xl"
        style={{ background: 'rgba(20,22,28,0.85)', backdropFilter: 'blur(24px) saturate(150%)' }}
      >
        <div className="flex items-start justify-between px-6 pt-5">
          <div>
            <h2 className="text-lg font-bold text-white">Book a viewing</h2>
            <p className="text-xs text-white/55">{address}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-white/50 hover:text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {done ? (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-good/15 text-good">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <p className="text-sm font-medium text-white">{done.confirmation}</p>
            <p className="mt-2 text-xs text-white/50">Our voice agent is reaching out to {realtorName} now.</p>
            <button type="button" onClick={onClose} className="btn-ghost mt-5 min-h-[44px] rounded-xl px-6 text-sm font-semibold">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 px-6 py-5">
            <p className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/65">
              An AI voice agent will call <span className="text-white">{realtorName}</span> on your behalf to request a tour and confirm a time.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs text-white/60">
                Your name
                <input value={name} onChange={(e) => setName(e.target.value)} required
                  className="min-h-[42px] rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white focus:border-accent focus:outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-white/60">
                Your phone
                <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" required placeholder="(555) 123-4567"
                  className="min-h-[42px] rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/30 focus:border-accent focus:outline-none" />
              </label>
            </div>
            <div className="flex flex-col gap-1 text-xs text-white/60">
              Preferred time
              <div className="flex flex-wrap gap-2">
                {TIMES.map((t) => (
                  <button key={t} type="button" onClick={() => setTime(t)}
                    className={['rounded-full border px-3 py-1.5 text-xs transition-colors',
                      time === t ? 'border-accent bg-accent/15 text-accent' : 'border-white/10 bg-white/[0.03] text-white/65 hover:text-white'].join(' ')}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1 text-xs text-white/60">
              Anything to add (optional)
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2}
                placeholder="e.g. I need a ground-floor unit and accept Section 8."
                className="resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-accent focus:outline-none" />
            </label>
            {error && <p role="alert" className="text-xs text-bad">{error}</p>}
            <button type="submit" disabled={busy} className="btn-neon min-h-[46px] w-full rounded-xl text-sm font-semibold disabled:opacity-60">
              {busy ? 'Sending request…' : 'Request the viewing'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

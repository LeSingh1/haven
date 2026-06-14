'use client';
// components/tour/VoiceWaveform.tsx — Siri-style voice visualizer shown in the
// centre of the tour viewport while the agent is thinking or talking. Purely
// decorative (the spoken text is announced via the aria-live status pill in
// TourShell), so it's aria-hidden. Driven by TourShell's voiceStatus.
import { motion, AnimatePresence } from 'framer-motion';
import type { VoiceStatus } from '@/lib/types';

// Symmetric peak so the equaliser reads as a natural "voice graph".
const BAR_HEIGHTS = [22, 34, 50, 66, 80, 66, 50, 34, 22];

const LABEL: Partial<Record<VoiceStatus, string>> = {
  thinking: 'Thinking…',
  speaking: 'Speaking…',
};

export default function VoiceWaveform({ status }: { status: VoiceStatus }) {
  const active = status === 'thinking' || status === 'speaking';
  const calm = status === 'thinking'; // gentler motion while it works things out

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <AnimatePresence>
        {active && (
          <motion.div
            key="voice-wave"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-6"
            aria-hidden
          >
            <div className={`voice-wave${calm ? ' voice-wave--calm' : ''}`}>
              {BAR_HEIGHTS.map((h, i) => (
                <span
                  key={i}
                  className="voice-wave__bar"
                  style={{ height: `${h}px`, animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            <span className="text-xs font-medium uppercase tracking-[0.22em] text-accent/80">
              {LABEL[status]}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

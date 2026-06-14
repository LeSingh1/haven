'use client';
// Smooth enter transition on every route change. The immersive 3D tour is excluded
// (no wrapper) so its fixed voice bar + full-height layout are never affected.
// Reduced-motion is honored globally by <MotionProvider> (MotionConfig reducedMotion="user").
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { EASE_OUT } from '@/lib/motion';
import { cancelSpeech } from '@/lib/useSpeech';

export default function Template({ children }: { children: React.ReactNode }) {
  const path = usePathname() || '';

  // Stop Haven's voice the instant you leave a page. Templates re-mount on every
  // navigation, so this cleanup fires on every page switch — the old page's
  // speech is cancelled on the way out, without clobbering the new page's.
  useEffect(() => cancelSpeech, []);

  if (path.startsWith('/tour/')) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

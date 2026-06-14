'use client';
// Smooth enter transition on every route change. The immersive 3D tour is excluded
// (no wrapper) so its fixed voice bar + full-height layout are never affected.
// Reduced-motion is honored globally by <MotionProvider> (MotionConfig reducedMotion="user").
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { EASE_OUT } from '@/lib/motion';

export default function Template({ children }: { children: React.ReactNode }) {
  const path = usePathname() || '';
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

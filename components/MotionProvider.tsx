'use client';
// Wraps the app so every Framer Motion animation automatically respects the
// user's "reduce motion" OS setting (transforms are dropped, opacity kept).
import { MotionConfig } from 'framer-motion';

export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

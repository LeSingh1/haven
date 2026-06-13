// lib/motion.ts — shared Framer Motion tokens + variants. Centralizes timing and
// easing so every animation in the app shares one rhythm (per the UI motion rules:
// 150–400ms, ease-out on enter, transform/opacity only, staggered list reveals).
// Reduced-motion is handled globally by <MotionProvider> (MotionConfig reducedMotion="user").
import type { Variants, Transition } from 'framer-motion';

// Smooth "expo-out" curve — natural deceleration on enter.
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.45, 0, 0.55, 1] as const;

export const SPRING_SOFT: Transition = { type: 'spring', stiffness: 320, damping: 30 };
export const SPRING_SNAP: Transition = { type: 'spring', stiffness: 520, damping: 32 };

/** Parent that reveals its children one after another. */
export const staggerContainer = (stagger = 0.06, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren } },
});

/** Child: rise + fade in. Pairs with staggerContainer. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

export const fadeUpSm: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease: EASE_OUT } },
};

/** Scale + fade for cards entering a grid. */
export const cardIn: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE_OUT } },
};

/** Status pill / toast pop (enter from trigger, exit faster). */
export const popIn: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.94 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.28, ease: EASE_OUT } },
  exit: { opacity: 0, y: -6, scale: 0.96, transition: { duration: 0.18, ease: EASE_IN_OUT } },
};

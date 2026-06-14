'use client';
// Smoothly counts from the previous value to the next (ease-out). Honors reduced-motion.
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export default function AnimatedNumber({
  value,
  className,
  duration = 550,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    if (reduce || fromRef.current === value) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce, duration]);

  return <span className={className}>{display.toLocaleString()}</span>;
}

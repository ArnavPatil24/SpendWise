import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Animates a number from its previous value to the new one. */
export function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(prefersReducedMotion() ? target : 0);
  const from = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) { setValue(target); return undefined; }
    const start = performance.now();
    const origin = from.current;
    let frame;
    const tick = now => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = origin + (target - origin) * eased;
      setValue(current);
      from.current = current;
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

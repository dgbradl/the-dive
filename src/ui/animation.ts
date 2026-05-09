import { useEffect, useRef, useState } from 'react';

/**
 * Animate a number from its previous value (or `initialFrom`) to `target`
 * over `durationMs` using ease-out-cubic. Re-targets smoothly on subsequent
 * changes — drives the new tween from the current displayed value.
 */
export function useCountUp(target: number, durationMs = 700, initialFrom?: number): number {
  const [value, setValue] = useState(initialFrom ?? target);
  const valueRef = useRef(value);
  valueRef.current = value;
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = valueRef.current;
    if (from === target) return;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (target - from) * eased;
      setValue(t === 1 ? target : Math.round(v));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return value;
}

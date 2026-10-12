'use client';

import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  /** Target value. */
  value: number;
  /** Decimal places to render. */
  decimals?: number;
  /** Prefix, e.g. "+". */
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
}

/**
 * Subtle count-up for headline numbers.
 *
 * The REAL value is rendered on the server and for the initial hydration
 * frame — crawlers, view-source and slow devices must never see "+0.0"
 * (that exact bug shipped once). Only after mount does the
 * number animate 0 → value, and prefers-reduced-motion skips the animation
 * entirely.
 */
export function CountUp({
  value,
  decimals = 1,
  prefix = '',
  suffix = '',
  durationMs = 900,
  className,
}: CountUpProps) {
  const [display, setDisplay] = useState(value);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return (
    <span
      className={className}
      aria-label={`${prefix}${value.toFixed(decimals)}${suffix}`}
    >
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

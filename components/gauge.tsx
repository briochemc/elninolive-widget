'use client';

import { useEffect, useState } from 'react';
import { INTENSITY_BANDS, formatAnom, gaugeMax, intensityFor, INTENSITY_LABELS } from '@/lib/enso';

const CX = 110;
const CY = 112;
const R = 88;
const MIN = 0;

/** Angle for `value` on a 0…max scale. Clamped only as a last guard — gaugeMax keeps
 *  the reading inside the scale, and an off-scale reading is flagged, never hidden. */
function angleFor(value: number, max: number): number {
  const v = Math.min(max, Math.max(MIN, value));
  return -90 + ((v - MIN) / (max - MIN)) * 180;
}

/** Tick marks: the band edges up to 2, then every 0.5 above 2.5 (2.5 itself is left
 *  out — at 220px wide it collides with 2 and 3). */
function ticksFor(max: number): number[] {
  const t = [0, 0.5, 1, 1.5, 2];
  for (let v = 3; v <= max + 1e-9; v += 0.5) t.push(Math.round(v * 10) / 10);
  return t;
}

function point(angleDeg: number, radius: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)];
}

function arcPath(from: number, to: number, radius: number): string {
  const [x1, y1] = point(from, radius);
  const [x2, y2] = point(to, radius);
  const large = to - from > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/**
 * Intensity gauge for the Niño 3.4 anomaly, colored with the shared RdBu
 * anomaly scale. The marker animates from 0 to the current value on load
 * (skipped under prefers-reduced-motion).
 */
export function Gauge({ value }: { value: number }) {
  const max = gaugeMax(value);
  const offScale = value > max;
  const [angle, setAngle] = useState(angleFor(0, max));
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setAnimate(!reduced);
    // Next frame so the transition actually runs from 0.
    const frame = requestAnimationFrame(() => setAngle(angleFor(value, max)));
    return () => cancelAnimationFrame(frame);
  }, [value, max]);

  const intensity = intensityFor(value);

  return (
    <div
      role="img"
      aria-label={`Intensity gauge: Niño 3.4 anomaly ${formatAnom(value)}, ${INTENSITY_LABELS[intensity]} El Niño territory on a scale from 0 to ${max} of neutral, weak, moderate, strong, very strong${offScale ? ' — beyond the end of the scale' : ''}`}
      className="mx-auto w-full max-w-[320px]"
    >
      {/* 12px of side room: the end label is two characters wider once the scale can end
          at 3.5 or 4 (it was clipped to "3." on 29.09). */}
      <svg viewBox="-12 0 244 128" className="w-full">
        {/* Colored intensity bands */}
        {INTENSITY_BANDS.map((band) => (
          <path
            key={band.key}
            // The top band (Very strong, from 2) runs to the end of the scale, whatever it is.
            d={arcPath(angleFor(band.min, max), angleFor(band.key === 'very-strong' ? max : Math.min(band.max, max), max), R)}
            fill="none"
            stroke={band.color}
            strokeWidth={16}
          />
        ))}
        {/* Band boundary ticks + numerals */}
        {ticksFor(max).map((tick) => {
          const a = angleFor(tick, max);
          const [x1, y1] = point(a, R - 11);
          const [x2, y2] = point(a, R + 9);
          const [tx, ty] = point(a, R + 20);
          return (
            <g key={tick}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgb(var(--c-ink-faint))"
                strokeWidth={1}
              />
              <text
                x={tx}
                y={ty}
                textAnchor="middle"
                dominantBaseline="middle"
                className="tnum fill-[rgb(var(--c-ink-muted))] font-mono text-[9px]"
              >
                {tick}
              </text>
            </g>
          );
        })}
        {/* Marker needle */}
        <g
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: `${CX}px ${CY}px`,
            transition: animate
              ? 'transform 1.1s cubic-bezier(0.34, 1.3, 0.5, 1)'
              : 'none',
          }}
        >
          <line
            x1={CX}
            y1={CY - 26}
            x2={CX}
            y2={CY - R - 12}
            stroke="rgb(var(--c-ink))"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <circle cx={CX} cy={CY - R - 12} r={4.5} fill="rgb(var(--c-ink))" />
        </g>
        <circle cx={CX} cy={CY} r={5} fill="rgb(var(--c-ink))" />
        {offScale ? (
          // Last-resort flag: gaugeMax should never let this happen, but a needle
          // silently parked on the end stop is exactly the bug this replaced.
          <text x={CX + R} y={CY + 12} textAnchor="end" className="fill-[rgb(var(--c-ink))] text-[9px] font-semibold">
            ▲ off scale · {formatAnom(value)}
          </text>
        ) : null}
      </svg>
      {/* Band legend chips — identity is never color-alone */}
      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {INTENSITY_BANDS.map((band) => (
          <span
            key={band.key}
            className={`inline-flex items-center gap-1 text-[10px] ${
              band.key === intensity ? 'font-semibold text-ink' : 'text-ink-faint'
            }`}
          >
            <span
              className="inline-block h-2 w-2 rounded-[2px]"
              style={{ background: band.color }}
              aria-hidden
            />
            {band.label}
          </span>
        ))}
      </div>
    </div>
  );
}

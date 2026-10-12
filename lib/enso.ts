import type { Intensity } from './data/types';

/**
 * Intensity bands for Niño 3.4 anomalies (°C), as used across the gauge,
 * charts and copy: Neutral < 0.5 · Weak 0.5–1 · Moderate 1–1.5 · Strong 1.5–2 ·
 * Very strong ≥ 2.
 */
export const INTENSITY_BANDS: {
  key: Intensity;
  label: string;
  min: number;
  max: number;
  /** Anomaly-scale color (light + dark safe, from the RdBu diverging scale). */
  color: string;
}[] = [
  { key: 'neutral', label: 'Neutral', min: 0, max: 0.5, color: '#C7D2DE' },
  { key: 'weak', label: 'Weak', min: 0.5, max: 1, color: '#FDDBC7' },
  { key: 'moderate', label: 'Moderate', min: 1, max: 1.5, color: '#F4A582' },
  { key: 'strong', label: 'Strong', min: 1.5, max: 2, color: '#D6604D' },
  { key: 'very-strong', label: 'Very strong', min: 2, max: 3, color: '#B2182B' },
];

export function intensityFor(anom: number): Intensity {
  const a = Math.abs(anom);
  if (a < 0.5) return 'neutral';
  if (a < 1) return 'weak';
  if (a < 1.5) return 'moderate';
  if (a < 2) return 'strong';
  return 'very-strong';
}

export const INTENSITY_LABELS: Record<Intensity, string> = {
  neutral: 'Neutral',
  weak: 'Weak',
  moderate: 'Moderate',
  strong: 'Strong',
  'very-strong': 'Very strong',
};

/** Format an anomaly with explicit sign, e.g. "+1.7°C". */
export function formatAnom(anom: number, digits = 1): string {
  const sign = anom > 0 ? '+' : '';
  return `${sign}${anom.toFixed(digits)}°C`;
}

/**
 * Upper end of the intensity scale for a reading. A fixed 3.0 end would pin the
 * needle at the end stop for readings above it (the weekly series reached +3.1 in
 * September 2026), hiding that the value went past the scale. So: never below 3;
 * otherwise the next 0.5 STRICTLY above the value, so the needle never sits on the
 * end stop (+3.0 → 3.5, +3.1 → 3.5, +3.6 → 4.0; 2.4 → 3).
 */
export function gaugeMax(value: number): number {
  return Math.max(3, Math.ceil((value + 0.01) * 2) / 2);
}

import { intensityFor } from '@/lib/enso';
import { getAdvisory } from './advisory';
import { getWeeklySst } from './weekly-sst';
import type { Direction, Envelope, EnsoPhase, EnsoStatus } from './types';

/**
 * Headline status derived from the latest weekly Niño 3.4 reading (phase,
 * intensity, four-week direction) plus CPC's official Alert System status.
 */
export async function getEnsoStatus(): Promise<Envelope<EnsoStatus>> {
  const [weekly, advisory] = await Promise.all([getWeeklySst(), getAdvisory()]);

  const rows = weekly.data;
  const latest = rows[rows.length - 1];
  const fourWeeksAgo = rows[Math.max(0, rows.length - 5)];

  const anom = latest.nino34.anom;
  const delta = anom - fourWeeksAgo.nino34.anom;

  const phase: EnsoPhase = anom >= 0.5 ? 'el-nino' : anom <= -0.5 ? 'la-nina' : 'neutral';
  const direction: Direction =
    Math.abs(anom) < Math.abs(fourWeeksAgo.nino34.anom) - 0.1 ||
    (anom > 0 && delta < -0.1)
      ? 'weakening'
      : anom > 0 && delta > 0.1
        ? 'strengthening'
        : anom < 0 && delta < -0.1
          ? 'strengthening'
          : 'steady';

  const status: EnsoStatus = {
    phase,
    advisory: advisory.data,
    nino34Anom: anom,
    weekCentered: latest.date,
    intensity: intensityFor(anom),
    direction,
  };

  return {
    data: status,
    source: weekly.source,
    sourceUrl: weekly.sourceUrl,
    fetchedAt: weekly.fetchedAt,
    isFallback: weekly.isFallback,
  };
}

import { fetchUpstreamText, fetchUpstreamTextFresh, REVALIDATE } from './fetch-upstream';
import { latestWeeklyLooksBroken, parseWeeklySst } from './parse';
import type { Envelope, WeeklySstRow } from './types';
import fallback from './fallback/weekly.json';

export const WEEKLY_SST_URL = 'https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for';
const SOURCE = 'NOAA CPC weekly SST (OISST v2.1, 1991–2020 climatology)';

/** NOAA publishes a new week every Monday; beyond this age something is wrong. */
const STALE_AFTER_DAYS = 14;

const isStale = (rows: WeeklySstRow[]) =>
  Date.now() - new Date(`${rows[rows.length - 1].date}T00:00:00Z`).getTime() >
  STALE_AFTER_DAYS * 86_400_000;

/** Weekly Niño-region SSTs and anomalies. Refreshes hourly — NOAA appends the
 *  new week on Monday mornings, and a daily cache key populated just after
 *  midnight would serve the previous week for the entire publication day.
 *  The file is a few KB; hourly costs nothing. */
export async function getWeeklySst(): Promise<Envelope<WeeklySstRow[]>> {
  try {
    const text = await fetchUpstreamText(WEEKLY_SST_URL, REVALIDATE.hourly);
    let rows = parseWeeklySst(text);
    if (rows.length < 100) throw new Error('weekly SST parse yielded too few rows');
    if (isStale(rows)) {
      // Poisoned data-cache entry (silent revalidation failures) — bypass it.
      console.warn('[data] weekly SST from cache is stale — no-store refetch');
      try {
        const freshRows = parseWeeklySst(await fetchUpstreamTextFresh(WEEKLY_SST_URL));
        if (
          freshRows.length >= 100 &&
          freshRows[freshRows.length - 1].date > rows[rows.length - 1].date
        ) {
          rows = freshRows;
        }
      } catch {
        // keep the cached parse; staleness is reported via isFallback below
      }
    }
    if (latestWeeklyLooksBroken(rows)) {
      // A 0.0/NaN headline while recent weeks run strong is a parse/upstream
      // artifact — serve the snapshot rather than a lie.
      throw new Error('latest weekly Niño 3.4 value looks like a parse artifact');
    }
    return {
      data: rows,
      source: SOURCE,
      sourceUrl: WEEKLY_SST_URL,
      fetchedAt: new Date().toISOString(),
      // Still stale after the rescue ⇒ upstream itself is behind.
      isFallback: isStale(rows),
    };
  } catch {
    return {
      data: fallback.rows as WeeklySstRow[],
      source: SOURCE,
      sourceUrl: WEEKLY_SST_URL,
      fetchedAt: fallback.savedAt,
      isFallback: true,
    };
  }
}

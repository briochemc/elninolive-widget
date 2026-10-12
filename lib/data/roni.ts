import { fetchUpstreamText, REVALIDATE } from './fetch-upstream';
import { parseRoniHtml } from './parse';
import type { Envelope, RoniRow } from './types';
import fallback from './fallback/roni.json';

export const RONI_URL = 'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/';
const SOURCE = 'NOAA CPC Relative Oceanic Niño Index (RONI), 1950–present';

/**
 * RONI seasonal history: NOAA CPC's relative ENSO index, the official
 * classification value shown under the two weekly readings. CPC publishes it
 * as an HTML table (there is no plain-text file), so the table is parsed.
 * Refreshes daily — the monthly row lands on an unannounced day, and a weekly
 * cache key would hide it for up to six days.
 */
export async function getRoni(): Promise<Envelope<RoniRow[]>> {
  try {
    const html = await fetchUpstreamText(RONI_URL, REVALIDATE.daily);
    const rows = parseRoniHtml(html);
    if (rows.length < 50) throw new Error('RONI parse yielded too few rows');
    return {
      data: rows,
      source: SOURCE,
      sourceUrl: RONI_URL,
      fetchedAt: new Date().toISOString(),
      isFallback: false,
    };
  } catch {
    return {
      data: fallback.rows as RoniRow[],
      source: SOURCE,
      sourceUrl: RONI_URL,
      fetchedAt: fallback.savedAt,
      isFallback: true,
    };
  }
}

/** The most recently published RONI season (assumes rows arrive chronological). */
export function latestRoni(rows: RoniRow[]): RoniRow {
  return rows[rows.length - 1];
}

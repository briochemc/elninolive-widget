import { fetchUpstreamText, REVALIDATE } from './fetch-upstream';
import { parseBomRnino } from './parse';
import type { BomRninoRow, Envelope } from './types';
import fallback from './fallback/bom-rnino.json';

export const BOM_RNINO_URL = 'https://www.bom.gov.au/clim_data/IDCK000072/rnino_3.4.txt';
const SOURCE = 'Australian Bureau of Meteorology, relative Niño 3.4 (weekly)';

/**
 * BOM's own El Niño threshold for THIS index — its own methodology, not
 * NOAA's ±0.5°C used for the conventional weekly reading and NOAA RONI.
 * Every one of the three headline numbers carries its own agency/threshold;
 * never substitute this constant for another metric's, or vice versa.
 */
export const BOM_RNINO_EL_NINO_THRESHOLD = 0.8;

/** BOM publishes a new week roughly every week; beyond this age something is wrong. */
const STALE_AFTER_DAYS = 14;

/** BOM blocks the plain default User-Agent — send a browser-like one. */
const BOM_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/plain,text/csv,*/*',
};

function isStale(rows: BomRninoRow[]): boolean {
  const latest = rows[rows.length - 1];
  return (
    Date.now() - new Date(`${latest.weekEnd}T00:00:00Z`).getTime() > STALE_AFTER_DAYS * 86_400_000
  );
}

/**
 * BOM's weekly relative Niño 3.4 index: a different agency's own relative
 * (vs-tropics) calculation from NOAA's RONI, published weekly rather than
 * seasonally, with its own +0.8°C El Niño threshold.
 *
 * Revalidated HOURLY, not weekly: a weekly cache key rotates Monday 00:00 UTC,
 * BOM publishes its new week later than that, so a weekly key would lock in the
 * pre-publication file for the following six days. The file is ~22 KB.
 *
 * TRAP: BOM also publishes a sibling JSON feed with a RAW weekly Niño 3.4
 * column whose value can coincidentally match a given week's *relative* value
 * in rnino_3.4.txt — they are different series. This module parses ONLY
 * rnino_3.4.txt, and every row is anchored on its date range, never
 * identified by its number.
 */
export async function getBomRnino(): Promise<Envelope<BomRninoRow[]>> {
  try {
    const text = await fetchUpstreamText(BOM_RNINO_URL, REVALIDATE.hourly, BOM_HEADERS);
    const rows = parseBomRnino(text);
    if (rows.length < 400) throw new Error('BOM relative Niño 3.4 parse yielded too few rows');
    const latest = rows[rows.length - 1];
    if (!Number.isFinite(latest.value) || Math.abs(latest.value) > 5) {
      // Plausibility guard: a relative Niño 3.4 reading this far from zero is
      // almost certainly a parse/upstream artifact, not a real value.
      throw new Error('BOM relative Niño 3.4 latest value is out of plausible range');
    }
    return {
      data: rows,
      source: SOURCE,
      sourceUrl: BOM_RNINO_URL,
      fetchedAt: new Date().toISOString(),
      isFallback: isStale(rows),
    };
  } catch {
    return {
      data: fallback.rows as BomRninoRow[],
      source: SOURCE,
      sourceUrl: BOM_RNINO_URL,
      fetchedAt: fallback.savedAt,
      isFallback: true,
    };
  }
}

/** The most recently published BOM week (assumes rows arrive chronological). */
export function latestBomRnino(rows: BomRninoRow[]): BomRninoRow {
  return rows[rows.length - 1];
}

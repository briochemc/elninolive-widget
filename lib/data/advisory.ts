import { fetchUpstreamText, REVALIDATE } from './fetch-upstream';
import { parseAlertStatus } from './parse';
import type { Envelope } from './types';
import fallback from './fallback/advisory.json';

export const DISCUSSION_URL =
  'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml';
const SOURCE = 'NOAA CPC / IRI ENSO Diagnostic Discussion — ENSO Alert System Status';

/**
 * CPC's ENSO Alert System status ("El Niño Advisory", "La Niña Watch",
 * "Not Active" …), read from the monthly ENSO Diagnostic Discussion.
 *
 * On elninolive.com this line comes from a JSON file that a scheduled job
 * refreshes from the same discussion page with the same regex. A standalone
 * copy has no such job, so it reads the page directly (daily cache) and only
 * falls back to the bundled value in fallback/advisory.json if the page cannot
 * be fetched or no longer contains the status line.
 */
export async function getAdvisory(): Promise<Envelope<string>> {
  try {
    const html = await fetchUpstreamText(DISCUSSION_URL, REVALIDATE.daily);
    const status = parseAlertStatus(html);
    if (!status) throw new Error('no "ENSO Alert System Status" line in the discussion');
    return {
      data: status,
      source: SOURCE,
      sourceUrl: DISCUSSION_URL,
      fetchedAt: new Date().toISOString(),
      isFallback: false,
    };
  } catch {
    return {
      data: fallback.advisoryStatus,
      source: SOURCE,
      sourceUrl: DISCUSSION_URL,
      fetchedAt: `${fallback.asOf}T12:00:00.000Z`,
      isFallback: true,
    };
  }
}

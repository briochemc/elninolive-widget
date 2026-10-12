import type { BomRninoRow, RoniRow, WeeklySstRow } from './types';

const MONTHS: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Parse the CPC weekly SST file (wksst9120.for).
 *
 * Data lines look like ` 17JUN2026     29.3 1.7     28.5 1.9 ...` — a date
 * followed by four (SST, anomaly) pairs for Niño 1+2, 3, 3.4 and 4. Negative
 * anomalies may be glued to the SST ("23.4-0.4"), so numbers are extracted with
 * a float regex rather than by splitting on whitespace.
 */
export function parseWeeklySst(text: string): WeeklySstRow[] {
  const rows: WeeklySstRow[] = [];
  for (const line of text.split('\n')) {
    const dateMatch = line.match(/^\s*(\d{2})([A-Z]{3})(\d{4})\b/);
    if (!dateMatch) continue;
    const month = MONTHS[dateMatch[2]];
    if (!month) continue;
    const nums = (line.slice(dateMatch[0].length).match(/-?\d+\.\d+/g) ?? []).map(Number);
    if (nums.length !== 8 || nums.some((n) => !Number.isFinite(n))) continue;
    rows.push({
      date: `${dateMatch[3]}-${pad(month)}-${dateMatch[1]}`,
      nino12: { sst: nums[0], anom: nums[1] },
      nino3: { sst: nums[2], anom: nums[3] },
      nino34: { sst: nums[4], anom: nums[5] },
      nino4: { sst: nums[6], anom: nums[7] },
    });
  }
  return rows;
}

/**
 * Sanity guard for the freshest weekly row: NOAA occasionally publishes a
 * placeholder/zero row before real data lands, and a column-offset regression
 * would also read as 0. If the newest Niño 3.4 anomaly is exactly 0 (or not
 * finite) while the recent weeks average well away from neutral (|mean| >
 * 0.5°C), the latest value is almost certainly a parse/upstream artifact, not
 * a real overnight collapse to neutral.
 */
export function latestWeeklyLooksBroken(rows: WeeklySstRow[]): boolean {
  if (rows.length < 6) return false;
  const latest = rows[rows.length - 1].nino34.anom;
  const priorFive = rows.slice(-6, -1).map((r) => r.nino34.anom);
  const mean = priorFive.reduce((sum, v) => sum + v, 0) / priorFive.length;
  const latestSuspect = !Number.isFinite(latest) || latest === 0;
  return latestSuspect && Math.abs(mean) > 0.5;
}

/** Season codes in table-column order, DJF (centered January) through NDJ. */
const RONI_SEASON_ORDER = [
  'DJF',
  'JFM',
  'FMA',
  'MAM',
  'AMJ',
  'MJJ',
  'JJA',
  'JAS',
  'ASO',
  'SON',
  'OND',
  'NDJ',
] as const;

/**
 * Parse the CPC RONI page (the populated table on the page). Each data row
 * looks like:
 *   <tr><th scope="row"><p>1950</p></th><td><span class="roni-cold" ...>-1.5</span></td>...</tr>
 * with up to 12 `<span>` cells (DJF..NDJ in column order); the newest year's
 * row is typically shorter (only the seasons published so far). Values are
 * pulled from the `<span>` text regardless of class (cold/normal/warm are
 * just the page's own color-coding, not a data signal).
 */
export function parseRoniHtml(html: string): RoniRow[] {
  const rows: RoniRow[] = [];
  const rowRe = /<tr[^>]*>\s*<th scope="row"><p>(\d{4})<\/p><\/th>([\s\S]*?)<\/tr>/g;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(html))) {
    const year = Number(rowMatch[1]);
    const cells = [...rowMatch[2].matchAll(/<span[^>]*>(-?\d+\.\d+)<\/span>/g)].map((c) =>
      Number(c[1])
    );
    cells.forEach((value, i) => {
      if (i >= RONI_SEASON_ORDER.length || !Number.isFinite(value)) return;
      rows.push({ season: RONI_SEASON_ORDER[i], year, value });
    });
  }
  return rows;
}

/** "20260726" → "2026-07-26". */
function isoFromCompactDate(compact: string): string {
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
}

/**
 * Parse BOM's weekly relative Niño 3.4 file (rnino_3.4.txt): plain CSV, no
 * header, `YYYYMMDD,YYYYMMDD,value` (week start, week end, relative Niño 3.4
 * anomaly). BOM's own El Niño threshold for this index is +0.8°C — see
 * BOM_RNINO_EL_NINO_THRESHOLD in bom-rnino.ts; never mix with NOAA's ±0.5°C.
 *
 * TRAP: a sibling BOM JSON feed carries a raw weekly Niño 3.4 column that can
 * coincidentally read the same number as a given week's *relative* value
 * here — never identify a row by value. Every row this parser returns is
 * anchored on its date range (weekStart/weekEnd), and callers must look
 * values up the same way.
 */
export function parseBomRnino(text: string): BomRninoRow[] {
  const rows: BomRninoRow[] = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*(\d{8}),(\d{8}),(-?\d+\.\d+)\s*$/);
    if (!m) continue;
    const value = Number(m[3]);
    if (!Number.isFinite(value)) continue;
    rows.push({
      weekStart: isoFromCompactDate(m[1]),
      weekEnd: isoFromCompactDate(m[2]),
      value,
    });
  }
  return rows;
}

/**
 * Decode the CPC ENSO Diagnostic Discussion HTML to plain text and read its
 * "ENSO Alert System Status" line (e.g. "El Niño Advisory", "La Niña Watch",
 * "Not Active"). Returns null when the line is not found — the caller falls
 * back to the bundled value rather than guessing.
 */
export function parseAlertStatus(html: string): string | null {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ');
  const m = text.match(
    /Alert System Status:\s*((?:Final )?(?:El Niño|La Niña) (?:Advisory|Watch)|Not Active)/i
  );
  return m ? m[1].trim() : null;
}

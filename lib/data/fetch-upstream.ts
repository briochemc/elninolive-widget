/**
 * Fetch an upstream text file through the Next.js data cache (ISR).
 * Throws on HTTP errors, timeouts, or suspiciously empty bodies so callers
 * can fall back to their bundled snapshot.
 *
 * Cache keys ROTATE with the calendar (a `cb` query param the upstream
 * static servers ignore): daily-revalidate sources get a per-day key,
 * weekly ones a per-ISO-week key. A data-cache entry whose background
 * revalidation keeps failing is otherwise served stale INDEFINITELY and
 * silently (the module never sees the failure, so it never falls back) —
 * key rotation caps that failure mode at one rotation period.
 */

const DAY_MS = 86_400_000;

export const REVALIDATE = {
  /** For sources whose upstream updates on a known weekday at a known-ish hour
   *  (NOAA weekly SST lands Monday morning UTC): a daily cache key set at
   *  00:xx Monday would lock the PRE-update file in for the whole publication
   *  day. Hourly revalidation caps that staleness at ~1h. */
  hourly: 3_600,
  /** Monthly-published CPC tables (RONI) and the monthly ENSO discussion land on
   *  an unannounced day. A weekly key would hide the new row for up to six days. */
  daily: 86_400,
  weekly: 604_800,
} as const;

/** Calendar-derived cache-buster: per-day for daily sources, per-ISO-week otherwise. */
function cacheBustKey(revalidateSeconds: number): string {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  if (revalidateSeconds <= REVALIDATE.daily) return day;
  // ISO week id (YYYY-Www)
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const week = Math.ceil(((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / DAY_MS + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function withCacheBust(url: string, key: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}cb=${key}`;
}

async function doFetch(
  url: string,
  cacheOpts: RequestInit,
  extraHeaders?: Record<string, string>
): Promise<string> {
  const res = await fetch(url, {
    ...cacheOpts,
    headers: {
      'User-Agent': 'elninolive-widget/1.0 (open-source El Niño status widget)',
      Accept: 'text/plain,*/*',
      ...extraHeaders,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`Upstream ${url} responded ${res.status}`);
  }
  const text = await res.text();
  if (text.length < 200) {
    throw new Error(`Upstream ${url} returned a suspiciously small body`);
  }
  return text;
}

/**
 * `extraHeaders` overrides the default User-Agent/Accept for upstreams that
 * block the plain default (e.g. BOM — see lib/data/bom-rnino.ts).
 */
export async function fetchUpstreamText(
  url: string,
  revalidateSeconds: number,
  extraHeaders?: Record<string, string>
): Promise<string> {
  return doFetch(
    withCacheBust(url, cacheBustKey(revalidateSeconds)),
    { next: { revalidate: revalidateSeconds } } as RequestInit,
    extraHeaders
  );
}

/** Bypass the data cache entirely — the rescue path when a cached body is stale. */
export async function fetchUpstreamTextFresh(
  url: string,
  extraHeaders?: Record<string, string>
): Promise<string> {
  return doFetch(withCacheBust(url, `fresh-${Date.now()}`), { cache: 'no-store' }, extraHeaders);
}

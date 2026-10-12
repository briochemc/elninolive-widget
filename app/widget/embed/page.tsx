import { CountUp } from '@/components/count-up';
import { Gauge } from '@/components/gauge';
import { INTENSITY_LABELS, formatAnom } from '@/lib/enso';
import { getEnsoStatus } from '@/lib/data/status';
import { getRoni, latestRoni } from '@/lib/data/roni';
import { BOM_RNINO_EL_NINO_THRESHOLD, getBomRnino, latestBomRnino } from '@/lib/data/bom-rnino';
import { site } from '@/lib/site';

export const revalidate = 3600;

export const metadata = {
  title: `${site.name} widget`,
  robots: { index: false, follow: false },
};

/**
 * The embeddable widget (iframe target, frameable by any origin — see
 * next.config.mjs). Compact status card: headline, live value, gauge and the
 * mandatory "Powered by" backlink. `?theme=dark` forces dark mode.
 *
 * Mirrors the THREE-number structure of the elninolive.com dashboard: the
 * weekly relative reading (BOM) leads, the conventional weekly sits alongside,
 * and seasonal RONI carries the official classification — third-party embeds
 * must not tell a different story than the site itself, since already-embedded
 * copies can't be retro-fixed.
 *
 * Two constraints this layout is built around:
 *   1. The published snippet hardcodes height=230 — already-embedded copies
 *      cannot be resized, so the third number had to fit the existing box.
 *   2. The intensity word ("very strong") describes the CONVENTIONAL index and
 *      is rendered next to that number, never next to RONI. Placed in the phase
 *      line directly above RONI it would imply e.g. RONI +0.5 = "very strong",
 *      which is methodologically wrong.
 */
export default async function WidgetEmbedPage(
  props: {
    searchParams: Promise<{ theme?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const [status, roni, bom] = await Promise.all([getEnsoStatus(), getRoni(), getBomRnino()]);
  const s = status.data;
  const r = latestRoni(roni.data);
  const b = latestBomRnino(bom.data);
  const dark = searchParams.theme === 'dark';

  const phaseLabel =
    s.phase === 'el-nino' ? 'El Niño' : s.phase === 'la-nina' ? 'La Niña' : 'Neutral';

  return (
    // Both themes are FORCED: `.dark` scopes the dark tokens, `.theme-light`
    // re-scopes the light ones. The embedder's choice (?theme=dark or not)
    // decides, never the end visitor's OS preference.
    <div className={dark ? 'dark' : 'theme-light'}>
      <div className="flex min-h-screen items-stretch bg-bg p-3 text-ink">
        <div className="flex w-full flex-col justify-between gap-1.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${dark ? 'text-coral' : 'text-coral-dark'}`}>
                {s.advisory}
              </p>
              <p className="mt-0.5 text-sm font-bold leading-tight">
                {phaseLabel}
                {s.direction !== 'steady' ? (
                  <span className="font-semibold text-ink-muted"> · {s.direction}</span>
                ) : null}
              </p>

              {/* Weekly relative leads — the live like-with-like signal. */}
              <p className="tnum mt-1.5 font-mono text-[26px] font-semibold leading-none">
                <CountUp value={b.value} decimals={1} prefix={b.value > 0 ? '+' : ''} suffix="°C" />
              </p>
              <p className="mt-0.5 text-[9px] font-medium leading-tight text-ink-faint">
                BOM relative Niño 3.4 · weekly · thr {formatAnom(BOM_RNINO_EL_NINO_THRESHOLD)}
              </p>

              {/* Conventional weekly — the intensity word belongs HERE, next to
                  the index the gauge bands are calibrated to, never next to RONI. */}
              <p className="tnum mt-1 font-mono text-sm font-semibold leading-none text-ink-muted">
                <CountUp
                  value={s.nino34Anom}
                  decimals={1}
                  prefix={s.nino34Anom > 0 ? '+' : ''}
                  suffix="°C"
                />
                {s.phase !== 'neutral' ? (
                  <span className={`ml-1.5 font-sans text-[9px] font-semibold uppercase tracking-wide ${dark ? 'text-coral' : 'text-coral-dark'}`}>
                    {INTENSITY_LABELS[s.intensity]}
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-[9px] leading-tight text-ink-faint">
                Niño 3.4 conventional · weekly · thr {formatAnom(0.5)}
              </p>

              {/* Seasonal RONI — the official classification value. */}
              <p className="tnum mt-1 font-mono text-xs font-semibold leading-none text-ink-muted">
                <CountUp value={r.value} decimals={1} prefix={r.value > 0 ? '+' : ''} suffix="°C" />
                <span className="ml-1.5 font-sans text-[9px] font-normal text-ink-faint">
                  NOAA RONI · seasonal · {r.season} {r.year}
                </span>
              </p>
            </div>
            <div className="w-[100px] shrink-0">
              <Gauge value={s.nino34Anom} />
            </div>
          </div>
          <a
            href={`${site.url}/?utm_source=widget&utm_medium=embed`}
            target="_blank"
            rel="noopener"
            className="text-[10px] font-medium text-ink-muted underline decoration-line underline-offset-2 hover:text-ink"
          >
            {site.widgetAttribution} → live dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

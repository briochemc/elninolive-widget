# ElNinoLive El Niño status widget

The source code of the embeddable El Niño status card that runs at
[elninolive.com/widget](https://www.elninolive.com/widget). It is a compact, always-current
card meant for newsrooms, school and course sites, farm portals and dashboards.

## What it shows

Three readings side by side, each labelled with its agency and its own El Niño threshold:

| Line | Reading | Agency | Cadence | Threshold |
|---|---|---|---|---|
| Large number | **Relative Niño 3.4** (Niño 3.4 minus the tropical-mean anomaly) | Australian Bureau of Meteorology (BoM) | weekly | +0.8 °C |
| Second number | **Conventional Niño 3.4 anomaly** (OISST v2.1, 1991–2020 base) plus an intensity word | NOAA Climate Prediction Center (CPC) | weekly | +0.5 °C |
| Third number | **RONI**, the Relative Oceanic Niño Index, latest three-month season | NOAA CPC | monthly | +0.5 °C |

Also on the card:

- **The ENSO Alert System status** (e.g. "El Niño Advisory") from CPC's monthly ENSO Diagnostic Discussion.
- **Phase and direction.** El Niño / Neutral / La Niña from the latest weekly Niño 3.4 (±0.5 °C), and
  strengthening / steady / weakening from the change over the last four weeks.
- **An intensity gauge** for the conventional weekly Niño 3.4: Neutral < 0.5, Weak 0.5–1,
  Moderate 1–1.5, Strong 1.5–2, Very strong ≥ 2 °C. The scale grows past 3 °C when a reading does.
  The needle shows the conventional index only, never RONI.
- **A "Powered by ElNinoLive" backlink** to the live dashboard.

## Data sources

The widget reads the agencies' own public files on the server. It does not call any
elninolive.com API.

| Reading | Exact file | Parsed in |
|---|---|---|
| Weekly Niño 3.4 (conventional) | NOAA CPC [`wksst9120.for`](https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for) | `lib/data/weekly-sst.ts` |
| RONI (seasonal) | NOAA CPC [RONI table](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/) (HTML; CPC publishes no plain-text RONI file) | `lib/data/roni.ts` |
| Relative Niño 3.4 (weekly) | BoM [`rnino_3.4.txt`](https://www.bom.gov.au/clim_data/IDCK000072/rnino_3.4.txt) | `lib/data/bom-rnino.ts` |
| ENSO Alert System status | NOAA CPC [ENSO Diagnostic Discussion](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml) | `lib/data/advisory.ts` |

The widget does **not** read the classic ONI file
([`oni.ascii.txt`](https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt)). It shows RONI
instead. See CPC's [RONI page](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/)
for how the two indices differ.

If a source cannot be fetched or parsed, the widget falls back to a snapshot bundled in
`lib/data/fallback/`, so it never shows an empty card or a made-up value.

## Update frequency

| Source | Agency publishes | Widget re-reads it |
|---|---|---|
| `wksst9120.for` | weekly (Monday) | every hour |
| `rnino_3.4.txt` | weekly | every hour |
| RONI table | monthly, on no fixed day | daily |
| ENSO Diagnostic Discussion | monthly (usually the second Thursday) | daily |

Caching is handled by the Next.js data cache (`lib/data/fetch-upstream.ts`). A new agency
release therefore shows up within an hour for the weekly readings and within a day for the
monthly ones.

## Embed it

To embed the hosted widget, paste one of these into any page:

```html
<!-- light -->
<iframe src="https://www.elninolive.com/widget/embed" width="360" height="230" style="border:0;border-radius:12px;overflow:hidden" title="Live El Niño status — ElNinoLive" loading="lazy"></iframe>

<!-- dark -->
<iframe src="https://www.elninolive.com/widget/embed?theme=dark" width="360" height="230" style="border:0;border-radius:12px;overflow:hidden" title="Live El Niño status — ElNinoLive" loading="lazy"></iframe>
```

You can also copy the snippet from [elninolive.com/widget](https://www.elninolive.com/widget).
The hosted widget is free to embed, including on sites with ads. Keep the
"Powered by ElNinoLive" link visible.

## Run it locally

Requirements: Node.js 18.18 or newer and npm. The build downloads the Inter and IBM Plex Mono
fonts once and then serves them from the app itself, so it needs internet access. So does the
running app, because it fetches the data files listed above.

```bash
npm install
npm run build
npm start          # http://localhost:3000
```

For development with hot reload, run `npm run dev`.

- `http://localhost:3000/` is a preview page showing both themes at the embed size.
- `http://localhost:3000/widget/embed` is the widget itself. Add `?theme=dark` for the dark theme.

To host your own copy, deploy it like any other Next.js app, for example with
`npm start` on a Node server or on Vercel. Then point the iframe `src` at `https://<your-host>/widget/embed`.
`next.config.mjs` already lets any origin frame that route and blocks framing everywhere else.

### Why Next.js

The widget reads NOAA and BoM files that do not send CORS headers, and BoM rejects requests
without a browser-like User-Agent. A browser-only app (e.g. plain Vite) therefore cannot
fetch them, and a server has to do it. Next.js does three things here:

- it fetches and parses the files on the server;
- it caches them per source (hourly or daily);
- it sends the card as finished HTML, so the numbers are visible before any JavaScript runs.

It is also what elninolive.com runs on, so this code is the production widget with the rest
of the site removed, not a rewrite. The only runtime dependencies are `next`, `react` and
`react-dom`. Tailwind CSS is used at build time only.

## Project layout

```
app/widget/embed/page.tsx   the widget (server component)
app/page.tsx                local preview page
app/layout.tsx, globals.css fonts and colour tokens (light/dark)
components/gauge.tsx        intensity gauge (SVG)
components/count-up.tsx     number animation (real value is server-rendered)
lib/enso.ts                 intensity bands, labels, gauge scale
lib/data/*.ts               fetching, parsing, fallbacks
lib/data/fallback/*.json    bundled snapshots used only when a source is unreachable
next.config.mjs             frame-ancestors * for /widget/embed only
```

## Attribution

Data: [NOAA CPC](https://www.cpc.ncep.noaa.gov/), [BoM](https://www.bom.gov.au/) · Widget: [ElNinoLive.com](https://www.elninolive.com)

NOAA data are in the public domain. BoM data are © Commonwealth of Australia, Bureau of
Meteorology. See the [BoM copyright notice](https://www.bom.gov.au/copyright)
for reuse terms.

## License

[MIT](LICENSE) © 2026 Iaroslav Vladymyr. The license covers this code. It does not cover the
agencies' data, and it gives no right to the ElNinoLive name.

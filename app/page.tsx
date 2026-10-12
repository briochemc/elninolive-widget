import { site } from '@/lib/site';

/**
 * Local preview only: both themes of /widget/embed at the published embed size,
 * plus the snippet that embeds the hosted widget from elninolive.com.
 */
export default function PreviewPage() {
  const snippet = (theme: 'light' | 'dark') =>
    `<iframe src="${site.url}/widget/embed${theme === 'dark' ? '?theme=dark' : ''}" width="360" height="230" style="border:0;border-radius:12px;overflow:hidden" title="Live El Niño status — ${site.name}" loading="lazy"></iframe>`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">El Niño status widget — local preview</h1>
      <p className="mt-2 text-sm text-ink-muted">
        The widget itself lives at <code className="font-mono">/widget/embed</code> (add{' '}
        <code className="font-mono">?theme=dark</code> for the dark version). Below: both themes
        at the published embed size, 360×230.
      </p>

      <div className="mt-6 flex flex-wrap gap-6">
        {(['light', 'dark'] as const).map((theme) => (
          <figure key={theme}>
            <iframe
              src={`/widget/embed${theme === 'dark' ? '?theme=dark' : ''}`}
              width={360}
              height={230}
              style={{ border: 0, borderRadius: 12, overflow: 'hidden' }}
              title={`Live El Niño status (${theme})`}
            />
            <figcaption className="mt-1 text-xs text-ink-faint">{theme}</figcaption>
          </figure>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold">Embed the hosted widget</h2>
      {(['light', 'dark'] as const).map((theme) => (
        <pre
          key={theme}
          className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-line bg-surface2 p-4 font-mono text-xs leading-relaxed"
        >
          {snippet(theme)}
        </pre>
      ))}
      <p className="mt-6 text-xs text-ink-faint">
        Data: NOAA CPC, BoM · Widget:{' '}
        <a className="underline" href={site.url}>
          ElNinoLive.com
        </a>
      </p>
    </main>
  );
}

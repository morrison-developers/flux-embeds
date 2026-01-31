export default function DevPage() {
  const embeds = [
    { name: 'Contact', path: '/contact?embedded=true&dense=true' },
];

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ margin: 0 }}>Embed Dev</h1>
      <p style={{ opacity: 0.7 }}>
        This page simulates a parent host. It listens for postMessage height updates
        and resizes iframes.
      </p>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('message', (event) => {
              const data = event.data;
              if (!data || typeof data !== 'object') return;
              if (data.type !== 'EMBED_SIZE') return;

              const iframes = document.querySelectorAll('iframe[data-embed]');
              for (const iframe of iframes) {
                if (iframe.contentWindow === event.source) {
                  iframe.style.height = data.height + 'px';
                }
              }
            });
          `,
        }}
      />

      <div style={{ display: 'grid', gap: 24, marginTop: 24 }}>
        {embeds.map((e) => (
          <div
            key={e.path}
            style={{
              border: '1px solid rgba(0,0,0,0.12)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: 12,
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ fontWeight: 600 }}>{e.name}</div>
              <a
                href={e.path}
                target="_blank"
                rel="noreferrer"
                style={{ opacity: 0.7 }}
              >
                open
              </a>
              <div style={{ marginLeft: 'auto', opacity: 0.6, fontSize: 12 }}>
                {e.path}
              </div>
            </div>

            <iframe
              data-embed
              src={e.path}
              style={{
                width: '100%',
                height: 200,
                border: 0,
                display: 'block',
              }}
              allow="autoplay; fullscreen"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
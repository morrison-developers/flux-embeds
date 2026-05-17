'use client';

import { useCallback, useEffect, useState } from 'react';

const EMBEDS = [
  { name: 'Contact', path: '/contact?embedded=true&dense=true' },
  { name: 'Mor Dev Particles', path: '/mor-dev-particles?embedded=true&dense=true' },
  { name: 'Download Button', path: '/download-btn?embedded=true&dense=true' },
  { name: 'Superb Owl', path: '/superb-owl?board=default&embedded=true&dense=true' },
  { name: 'Shavon Lloyd Contact', path: '/shavon-lloyd-contact?embedded=true&dense=true' },
  { name: 'Shavon Lloyd Calendar', path: '/shavon-lloyd-calendar?embedded=true&dense=true' },
  { name: 'Shavon Lloyd Gallery', path: '/shavon-lloyd-gallery?embedded=true&dense=true' },
  { name: 'Shavon Lloyd Instagram', path: '/shavon-lloyd-instagram?embedded=true&dense=true' },
  { name: 'Wizard Survivor', path: '/wizard-survivor?embedded=true&dense=true' },
];

function buildEmbedSnippet(path: string, origin: string) {
  const src = new URL(path, origin).toString();

  return [
    '<iframe',
    `  src="${src}"`,
    '  style="width:100%;height:200px;border:0;display:block;"',
    '  loading="lazy"',
    '  allow="autoplay; fullscreen"',
    '  referrerpolicy="no-referrer-when-downgrade"',
    '></iframe>',
  ].join('\n');
}

export default function DevPage() {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (!('type' in data) || data.type !== 'EMBED_SIZE') return;

      const iframes = document.querySelectorAll<HTMLIFrameElement>('iframe[data-embed]');
      for (const iframe of iframes) {
        if (iframe.contentWindow === event.source) {
          const height = Number((data as { height?: unknown }).height);
          if (!Number.isFinite(height)) return;
          iframe.style.height = `${height}px`;
        }
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const copySnippet = useCallback(async (path: string) => {
    const snippet = buildEmbedSnippet(path, window.location.origin);

    try {
      await navigator.clipboard.writeText(snippet);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = snippet;
      textarea.style.position = 'fixed';
      textarea.style.top = '-1000px';
      textarea.style.left = '-1000px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }

    setCopiedPath(path);
    window.setTimeout(() => {
      setCopiedPath((prev) => (prev === path ? null : prev));
    }, 1600);
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ margin: 0 }}>Embed Dev</h1>
      <p style={{ opacity: 0.7 }}>
        This page simulates a parent host. It listens for postMessage height updates
        and resizes iframes.
      </p>

      <div style={{ display: 'grid', gap: 24, marginTop: 24 }}>
        {EMBEDS.map((e) => (
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
              <button
                type="button"
                onClick={() => copySnippet(e.path)}
                style={{
                  border: '1px solid rgba(0,0,0,0.14)',
                  borderRadius: 8,
                  background: 'white',
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {copiedPath === e.path ? 'Copied' : 'Copy iframe'}
              </button>
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

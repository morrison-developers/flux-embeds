'use client';

import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { attachAutoResize } from './iframe';

type EmbedParams = {
  embedded: boolean;
  bg: 'default' | 'transparent';
  dense: boolean;
};

function parseEmbedParams(sp: ReturnType<typeof useSearchParams>): EmbedParams {
  const embedded = sp.get('embedded') === 'true';
  const bg = sp.get('bg') === 'transparent' ? 'transparent' : 'default';
  const dense = sp.get('dense') === 'true';
  return { embedded, bg, dense };
}

function EmbedParamsBridge({
  onChange,
}: {
  onChange: (params: EmbedParams) => void;
}) {
  const sp = useSearchParams();

  const parsed = useMemo(() => parseEmbedParams(sp), [sp]);

  useEffect(() => {
    onChange(parsed);
  }, [parsed, onChange]);

  return null;
}

export function EmbedShell(props: { title?: string; children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [params, setParams] = useState<EmbedParams>({
    embedded: false,
    bg: 'default',
    dense: false,
  });

  useEffect(() => {
    if (!rootRef.current) return;
    return attachAutoResize(rootRef.current);
  }, []);

  const padding = params.dense ? 12 : 20;

  return (
    <div
      ref={rootRef}
      data-embed-bg={params.bg === 'transparent' ? 'transparent' : undefined}
      style={{
        width: '100%',
        minHeight: '100%',
        background: params.bg === 'transparent' ? 'transparent' : '#fff',
      }}
    >
      <Suspense fallback={null}>
        <EmbedParamsBridge onChange={setParams} />
      </Suspense>

      <div
        style={{
          padding,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        }}
      >
        {props.title ? (
          <div style={{ marginBottom: 12, fontSize: 14, opacity: 0.7 }}>
            {props.title}
          </div>
        ) : null}

        {props.children}
      </div>
    </div>
  );
}
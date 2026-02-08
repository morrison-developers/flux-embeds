'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { attachAutoResize } from './iframe';

type EmbedParams = {
  embedded: boolean;
  bg: 'default' | 'transparent';
  dense: boolean;
};

type ParsedEmbedParams = {
  embedded: boolean;
  bg?: 'default' | 'transparent';
  dense: boolean;
};

function parseEmbedParams(sp: ReturnType<typeof useSearchParams>): ParsedEmbedParams {
  const embedded = sp.get('embedded') === 'true';
  const bgParam = sp.get('bg');
  const bg =
    bgParam === 'transparent'
      ? 'transparent'
      : bgParam === 'default'
        ? 'default'
        : undefined;
  const dense = sp.get('dense') === 'true';
  return { embedded, bg, dense };
}

function EmbedParamsBridge({
  onChange,
}: {
  onChange: (params: ParsedEmbedParams) => void;
}) {
  const sp = useSearchParams();

  const parsed = useMemo(() => parseEmbedParams(sp), [sp]);

  useEffect(() => {
    onChange(parsed);
  }, [parsed, onChange]);

  return null;
}

export function EmbedShell(props: {
  title?: string;
  children: React.ReactNode;
  defaultBg?: 'default' | 'transparent';
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [params, setParams] = useState<EmbedParams>({
    embedded: false,
    bg: props.defaultBg ?? 'default',
    dense: false,
  });

  useEffect(() => {
    if (!rootRef.current) return;
    return attachAutoResize(rootRef.current);
  }, []);

  const handleParamsChange = useCallback(
    (next: ParsedEmbedParams) => {
      setParams((prev) => {
        const nextBg = next.bg ?? prev.bg ?? props.defaultBg ?? 'default';

        if (
          prev.embedded === next.embedded &&
          prev.dense === next.dense &&
          prev.bg === nextBg
        ) {
          return prev;
        }

        return {
          ...prev,
          embedded: next.embedded,
          dense: next.dense,
          bg: nextBg,
        };
      });
    },
    [props.defaultBg]
  );

  return (
    <div
      ref={rootRef}
      data-embed-bg={params.bg === 'transparent' ? 'transparent' : undefined}
      style={{
        width: '100%',
        background: params.bg === 'transparent' ? 'transparent' : '#fff',
      }}
    >
      <Suspense fallback={null}>
        <EmbedParamsBridge onChange={handleParamsChange} />
      </Suspense>

      <div
        style={{
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

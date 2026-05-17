'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { EmbedShell } from '../_shared/EmbedShell';
import styles from './shavon-lloyd-instagram.module.css';

type InstagramMediaItem = {
  id: string;
  caption: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  mediaUrl: string;
  permalink: string;
  thumbnailUrl: string | null;
  timestamp: string | null;
};

type InstagramResponse = {
  username: string;
  profileUrl: string;
  media: InstagramMediaItem[];
  connected: boolean;
};

type InstagramState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; feed: InstagramResponse };

export default function ShavonLloydInstagramPage() {
  return (
    <Suspense fallback={null}>
      <ShavonLloydInstagramContent />
    </Suspense>
  );
}

function ShavonLloydInstagramContent() {
  const searchParams = useSearchParams();
  const limit = useMemo(() => searchParams.get('limit')?.trim() || '10', [searchParams]);
  const [state, setState] = useState<InstagramState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    async function loadInstagram() {
      setState({ status: 'loading' });

      try {
        const response = await fetch(
          `/api/features/shavon-lloyd-instagram?limit=${encodeURIComponent(limit)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch Instagram media: ${response.status}`);
        }

        const data = (await response.json()) as InstagramResponse;
        setState({
          status: 'ready',
          feed: {
            username: data.username || 'shavonlloyd',
            profileUrl: data.profileUrl || 'https://www.instagram.com/shavonlloyd/',
            media: Array.isArray(data.media) ? data.media : [],
            connected: Boolean(data.connected),
          },
        });
      } catch (error) {
        if (controller.signal.aborted) return;

        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error.',
        });
      }
    }

    loadInstagram();

    return () => controller.abort();
  }, [limit]);

  return (
    <EmbedShell defaultBg="transparent">
      <section className={styles.root}>
        <div className={styles.frame}>
          <div className={styles.header}>
            <h2 className={styles.title}>Instagram</h2>
            {state.status === 'ready' ? (
              <a
                className={styles.profileLink}
                href={state.feed.profileUrl}
                target="_blank"
                rel="noreferrer"
              >
                @{state.feed.username}
              </a>
            ) : null}
          </div>

          {state.status === 'loading' ? (
            <div className={styles.statusBlock} aria-busy="true" aria-live="polite">
              <p className={styles.statusText}>Loading Instagram...</p>
            </div>
          ) : null}

          {state.status === 'error' ? (
            <div className={styles.statusBlock} role="alert">
              <p className={styles.statusTitle}>Unable to load Instagram</p>
              <p className={styles.statusText}>{state.message}</p>
            </div>
          ) : null}

          {state.status === 'ready' ? (
            state.feed.media.length > 0 ? (
              <div className={styles.grid}>
                {state.feed.media.map((item) => {
                  const imageUrl = item.mediaType === 'VIDEO' && item.thumbnailUrl
                    ? item.thumbnailUrl
                    : item.mediaUrl;

                  return (
                    <a
                      key={item.id}
                      className={styles.tile}
                      href={item.permalink}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={item.caption || `Open Instagram post by ${state.feed.username}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt={item.caption || `Instagram post by ${state.feed.username}`}
                        className={styles.image}
                      />
                      {item.mediaType === 'VIDEO' ? (
                        <span className={styles.badge}>Video</span>
                      ) : null}
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className={styles.statusBlock}>
                <p className={styles.statusTitle}>@{state.feed.username}</p>
                <a
                  className={styles.followLink}
                  href={state.feed.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on Instagram
                </a>
              </div>
            )
          ) : null}
        </div>
      </section>
    </EmbedShell>
  );
}

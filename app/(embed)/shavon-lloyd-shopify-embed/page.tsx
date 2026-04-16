'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { EmbedShell } from '../_shared/EmbedShell';
import styles from './shavon-lloyd-shopify-embed.module.css';

type Product = {
  id: string;
  title: string;
  handle: string;
  onlineStoreUrl: string;
  image: {
    url: string;
    altText: string | null;
    width: number | null;
    height: number | null;
  } | null;
  price: {
    amount: string;
    currencyCode: string;
  } | null;
};

type CollectionResponse = {
  title: string;
  handle: string;
  products: Product[];
};

type EmbedState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; products: Product[] };

export default function ShavonLloydShopifyEmbedPage() {
  return (
    <Suspense fallback={null}>
      <ShavonLloydShopifyEmbedContent />
    </Suspense>
  );
}

function ShavonLloydShopifyEmbedContent() {
  const searchParams = useSearchParams();
  const handle = useMemo(() => searchParams.get('handle')?.trim() || 'frontpage', [searchParams]);
  const [state, setState] = useState<EmbedState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    async function loadCollection() {
      setState({ status: 'loading' });

      try {
        const response = await fetch(
          `/api/features/shavon-lloyd-shopify-embed?handle=${encodeURIComponent(handle)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch collection: ${response.status}`);
        }

        const data = (await response.json()) as CollectionResponse;
        setState({
          status: 'ready',
          products: Array.isArray(data.products) ? data.products : [],
        });
      } catch (error) {
        if (controller.signal.aborted) return;

        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error.',
        });
      }
    }

    loadCollection();

    return () => controller.abort();
  }, [handle]);

  return (
    <EmbedShell defaultBg="transparent">
      <section className={styles.root}>
        <div className={styles.frame}>
          {state.status === 'loading' ? (
            <div className={styles.statusBlock} aria-busy="true" aria-live="polite">
              <p className={styles.eyebrow}>Shavon Lloyd</p>
              <h2 className={styles.title}>Loading collection...</h2>
            </div>
          ) : null}

          {state.status === 'error' ? (
            <div className={styles.statusBlock} role="alert">
              <p className={styles.eyebrow}>Shavon Lloyd</p>
              <h2 className={styles.title}>Unable to load collection</h2>
              <p className={styles.message}>{state.message}</p>
            </div>
          ) : null}

          {state.status === 'ready' ? (
            <>
              {state.products.length === 0 ? (
                <div className={styles.statusBlock}>
                  <p className={styles.message}>
                    No published products are available in this collection yet.
                  </p>
                </div>
              ) : (
                <div className={styles.grid}>
                  {state.products.map((product) => {
                    return (
                      <a
                        key={product.id}
                        href={product.onlineStoreUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.card}
                      >
                        {product.image ? (
                          <div className={styles.imageFrame}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={product.image.url}
                              alt={product.image.altText || product.title}
                              className={styles.image}
                            />
                          </div>
                        ) : null}

                        <div className={styles.cardBody}>
                          <h3 className={styles.cardTitle}>{product.title}</h3>
                          <p className={styles.linkLabel}>View in store</p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}
        </div>
      </section>
    </EmbedShell>
  );
}

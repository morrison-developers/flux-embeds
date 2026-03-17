'use client';

import { useEffect, useState } from 'react';
import { MasonryPhotoAlbum, type Photo } from 'react-photo-album';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import 'react-photo-album/masonry.css';
import { EmbedShell } from '../_shared/EmbedShell';
import { mapGalleryImagesToPhotos, type GalleryResponse } from './gallery';
import styles from './shavon-lloyd-gallery.module.css';

type GalleryState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; folderName: string; photos: Photo[] };

export default function ShavonLloydGalleryPage() {
  const [state, setState] = useState<GalleryState>({ status: 'loading' });
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGallery() {
      try {
        const response = await fetch('/api/features/shavon-lloyd-gallery', {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch gallery: ${response.status}`);
        }

        const data = (await response.json()) as GalleryResponse;
        const folderName =
          typeof data.folderName === 'string' && data.folderName.trim().length > 0
            ? data.folderName
            : 'Gallery';

        setState({
          status: 'ready',
          folderName,
          photos: mapGalleryImagesToPhotos(Array.isArray(data.images) ? data.images : []),
        });
      } catch (error) {
        if (controller.signal.aborted) return;

        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error.',
        });
      }
    }

    loadGallery();

    return () => controller.abort();
  }, []);

  return (
    <EmbedShell defaultBg="transparent">
      <section className={styles.root}>
        <div className={styles.frame}>
          {state.status === 'loading' ? (
            <div className={styles.loading} aria-busy="true" aria-live="polite">
              <h2 className={styles.title}>Gallery</h2>
              <p className={styles.status}>Loading gallery...</p>
            </div>
          ) : null}

          {state.status === 'error' ? (
            <div className={styles.error} role="alert">
              <h2 className={styles.errorTitle}>Error loading gallery</h2>
              <p className={styles.status}>{state.message}</p>
            </div>
          ) : null}

          {state.status === 'ready' ? (
            <>
              <h2 className={styles.title}>{state.folderName}</h2>

              <div className={styles.gallery}>
                <MasonryPhotoAlbum
                  photos={state.photos}
                  onClick={({ index }) => setLightboxIndex(index)}
                />
              </div>

              <Lightbox
                open={lightboxIndex >= 0}
                index={lightboxIndex}
                close={() => setLightboxIndex(-1)}
                slides={state.photos}
              />
            </>
          ) : null}
        </div>
      </section>
    </EmbedShell>
  );
}

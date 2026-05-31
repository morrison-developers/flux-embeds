'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { MasonryPhotoAlbum, type Photo } from 'react-photo-album';
import 'react-photo-album/masonry.css';
import { EmbedShell } from '../_shared/EmbedShell';
import { postEmbedScroll } from '../_shared/iframe';
import { localGallery, mapGalleryImagesToPhotos } from './gallery';
import styles from './shavon-lloyd-gallery.module.css';

const albumPhotos: Photo[] = mapGalleryImagesToPhotos(localGallery.images, 'thumbnail');
const lightboxSlides: Photo[] = mapGalleryImagesToPhotos(localGallery.images, 'full');

export default function ShavonLloydGalleryPage() {
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const selectedPhoto = lightboxIndex >= 0 ? lightboxSlides[lightboxIndex] : null;

  useEffect(() => {
    if (!selectedPhoto) return;

    const frameId = requestAnimationFrame(() => {
      const viewer = viewerRef.current;
      if (!viewer) return;

      const top = viewer.getBoundingClientRect().top + window.scrollY;
      postEmbedScroll(Math.max(0, top - 12));
    });

    return () => cancelAnimationFrame(frameId);
  }, [selectedPhoto]);

  const showPreviousPhoto = () => {
    setLightboxIndex((index) => (index <= 0 ? lightboxSlides.length - 1 : index - 1));
  };

  const showNextPhoto = () => {
    setLightboxIndex((index) => (index >= lightboxSlides.length - 1 ? 0 : index + 1));
  };

  return (
    <EmbedShell defaultBg="transparent">
      <section className={styles.root}>
        <div className={styles.frame}>
          <h2 className={styles.title}>{localGallery.folderName}</h2>

          {selectedPhoto ? (
            <div
              ref={viewerRef}
              className={styles.viewer}
              role="dialog"
              aria-label={selectedPhoto.alt ?? 'Selected gallery photo'}
            >
              <div className={styles.viewerToolbar}>
                <button
                  type="button"
                  className={styles.viewerButton}
                  onClick={showPreviousPhoto}
                  aria-label="Previous photo"
                >
                  Previous
                </button>
                <span className={styles.viewerCount}>
                  {lightboxIndex + 1} / {lightboxSlides.length}
                </span>
                <button
                  type="button"
                  className={styles.viewerButton}
                  onClick={showNextPhoto}
                  aria-label="Next photo"
                >
                  Next
                </button>
                <button
                  type="button"
                  className={styles.closeButton}
                  onClick={() => setLightboxIndex(-1)}
                  aria-label="Close selected photo"
                >
                  <span aria-hidden="true" />
                </button>
              </div>

              <Image
                className={styles.viewerImage}
                src={selectedPhoto.src}
                alt={selectedPhoto.alt ?? ''}
                width={selectedPhoto.width}
                height={selectedPhoto.height}
                unoptimized
              />
            </div>
          ) : null}

          <div className={styles.gallery}>
            <MasonryPhotoAlbum
              photos={albumPhotos}
              columns={(containerWidth) => {
                if (containerWidth < 640) return 1;
                if (containerWidth < 980) return 2;
                return 3;
              }}
              onClick={({ index }) => setLightboxIndex(index)}
            />
          </div>
        </div>
      </section>
    </EmbedShell>
  );
}

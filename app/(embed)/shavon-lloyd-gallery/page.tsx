'use client';

import { useState } from 'react';
import { MasonryPhotoAlbum, type Photo } from 'react-photo-album';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import 'react-photo-album/masonry.css';
import { EmbedShell } from '../_shared/EmbedShell';
import { localGallery, mapGalleryImagesToPhotos } from './gallery';
import styles from './shavon-lloyd-gallery.module.css';

const albumPhotos: Photo[] = mapGalleryImagesToPhotos(localGallery.images, 'thumbnail');
const lightboxSlides: Photo[] = mapGalleryImagesToPhotos(localGallery.images, 'full');

export default function ShavonLloydGalleryPage() {
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  return (
    <EmbedShell defaultBg="transparent">
      <section className={styles.root}>
        <div className={styles.frame}>
          <h2 className={styles.title}>{localGallery.folderName}</h2>

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

          <Lightbox
            open={lightboxIndex >= 0}
            index={lightboxIndex}
            close={() => setLightboxIndex(-1)}
            slides={lightboxSlides}
          />
        </div>
      </section>
    </EmbedShell>
  );
}

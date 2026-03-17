import type { Photo } from 'react-photo-album';

export type GalleryImage = {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
};

export type GalleryResponse = {
  folderName: string;
  images: GalleryImage[];
};

export function normalizeGalleryDimensions(width: number, height: number) {
  const ratio = width / height;

  if (ratio < 0.6) {
    return { width: 1200, height: 1800 };
  }

  if (ratio > 1.6) {
    return { width: 1600, height: 1000 };
  }

  return { width, height };
}

export function mapGalleryImagesToPhotos(images: GalleryImage[]): Photo[] {
  return images.map((image) => {
    const normalized = normalizeGalleryDimensions(image.width, image.height);

    return {
      src: image.url,
      alt: image.name,
      width: normalized.width,
      height: normalized.height,
    };
  });
}

import type { Photo } from 'react-photo-album';

export type GalleryImage = {
  id: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
};

export type GalleryResponse = {
  folderName: string;
  images: GalleryImage[];
};

export const localGallery: GalleryResponse = {
  folderName: 'Media Gallery',
  images: [
    {
      id: 'shavon-photo-1',
      name: 'Shavon Lloyd photo 1',
      url: '/gallery/shavon-photo-1.webp',
      thumbnailUrl: '/gallery/thumbs/shavon-photo-1.webp',
      width: 2000,
      height: 1333,
      thumbnailWidth: 700,
      thumbnailHeight: 467,
    },
    {
      id: 'shavon-photo-2',
      name: 'Shavon Lloyd photo 2',
      url: '/gallery/shavon-photo-2.webp',
      thumbnailUrl: '/gallery/thumbs/shavon-photo-2.webp',
      width: 1066,
      height: 1600,
      thumbnailWidth: 466,
      thumbnailHeight: 700,
    },
    {
      id: 'shavon-photo-3',
      name: 'Shavon Lloyd photo 3',
      url: '/gallery/shavon-photo-3.webp',
      thumbnailUrl: '/gallery/thumbs/shavon-photo-3.webp',
      width: 1024,
      height: 682,
      thumbnailWidth: 700,
      thumbnailHeight: 466,
    },
    {
      id: 'shavon-photo-4',
      name: 'Shavon Lloyd photo 4',
      url: '/gallery/shavon-photo-4.webp',
      thumbnailUrl: '/gallery/thumbs/shavon-photo-4.webp',
      width: 682,
      height: 1024,
      thumbnailWidth: 466,
      thumbnailHeight: 700,
    },
    {
      id: 'shavon-photo-5',
      name: 'Shavon Lloyd photo 5',
      url: '/gallery/shavon-photo-5.webp',
      thumbnailUrl: '/gallery/thumbs/shavon-photo-5.webp',
      width: 1600,
      height: 1068,
      thumbnailWidth: 700,
      thumbnailHeight: 467,
    },
    {
      id: 'shavon-photo-6',
      name: 'Shavon Lloyd photo 6',
      url: '/gallery/shavon-photo-6.webp',
      thumbnailUrl: '/gallery/thumbs/shavon-photo-6.webp',
      width: 1536,
      height: 1025,
      thumbnailWidth: 700,
      thumbnailHeight: 467,
    },
    {
      id: 'shavon-photo-7',
      name: 'Shavon Lloyd photo 7',
      url: '/gallery/shavon-photo-7.webp',
      thumbnailUrl: '/gallery/thumbs/shavon-photo-7.webp',
      width: 1480,
      height: 987,
      thumbnailWidth: 700,
      thumbnailHeight: 467,
    },
    {
      id: 'shavon-photo-8',
      name: 'Shavon Lloyd photo 8',
      url: '/gallery/shavon-photo-8.webp',
      thumbnailUrl: '/gallery/thumbs/shavon-photo-8.webp',
      width: 1480,
      height: 987,
      thumbnailWidth: 700,
      thumbnailHeight: 467,
    },
    {
      id: 'shavon-photo-9',
      name: 'Shavon Lloyd photo 9',
      url: '/gallery/shavon-photo-9.webp',
      thumbnailUrl: '/gallery/thumbs/shavon-photo-9.webp',
      width: 1284,
      height: 1911,
      thumbnailWidth: 470,
      thumbnailHeight: 700,
    },
    {
      id: 'shavon-photo-10',
      name: 'Shavon Lloyd photo 10',
      url: '/gallery/shavon-photo-10.webp',
      thumbnailUrl: '/gallery/thumbs/shavon-photo-10.webp',
      width: 1000,
      height: 644,
      thumbnailWidth: 700,
      thumbnailHeight: 451,
    },
    {
      id: 'shavon-photo-11',
      name: 'Shavon Lloyd photo 11',
      url: '/gallery/shavon-photo-11.webp',
      thumbnailUrl: '/gallery/thumbs/shavon-photo-11.webp',
      width: 1000,
      height: 750,
      thumbnailWidth: 700,
      thumbnailHeight: 525,
    },
    {
      id: 'shavon-photo-12',
      name: 'Shavon Lloyd photo 12',
      url: '/gallery/shavon-photo-12.webp',
      thumbnailUrl: '/gallery/thumbs/shavon-photo-12.webp',
      width: 1000,
      height: 750,
      thumbnailWidth: 700,
      thumbnailHeight: 525,
    },
  ],
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

type GalleryPhotoVariant = 'full' | 'thumbnail';

export function mapGalleryImagesToPhotos(
  images: GalleryImage[],
  variant: GalleryPhotoVariant = 'full'
): Photo[] {
  return images.map((image) => {
    const normalized = normalizeGalleryDimensions(image.width, image.height);
    const useThumbnail = variant === 'thumbnail';

    return {
      src: useThumbnail ? image.thumbnailUrl : image.url,
      alt: image.name,
      width: normalized.width,
      height: normalized.height,
    };
  });
}

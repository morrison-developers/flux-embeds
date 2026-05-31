// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mapGalleryImagesToPhotos,
  normalizeGalleryDimensions,
} from './gallery';

const masonryAlbum = vi.fn();

vi.mock('../_shared/EmbedShell', () => ({
  EmbedShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('react-photo-album', () => ({
  MasonryPhotoAlbum: (props: {
    photos: Array<{ src: string }>;
    onClick?: (args: { index: number }) => void;
  }) => {
    masonryAlbum(props);
    return (
      <div>
        <div data-testid="photo-count">{props.photos.length}</div>
        <button type="button" onClick={() => props.onClick?.({ index: 0 })}>
          open photo
        </button>
      </div>
    );
  },
}));

describe('shavon lloyd gallery page', () => {
  beforeEach(() => {
    masonryAlbum.mockReset();
    vi.restoreAllMocks();
  });

  it('renders the local gallery and opens full-size images inline', async () => {
    const { default: Page } = await import('./page');
    render(<Page />);

    expect(screen.getByText('Media Gallery')).toBeTruthy();

    expect(screen.getByTestId('photo-count').textContent).toBe('12');
    expect(masonryAlbum).toHaveBeenCalledWith(
      expect.objectContaining({
        photos: expect.arrayContaining([
          expect.objectContaining({ src: '/gallery/thumbs/shavon-photo-1.webp' }),
        ]),
      })
    );

    fireEvent.click(screen.getByText('open photo'));

    const selectedPhoto = await screen.findByRole('dialog', {
      name: 'Shavon Lloyd photo 1',
    });
    const selectedImage = selectedPhoto.querySelector('img');

    expect(selectedImage?.getAttribute('src')).toBe('/gallery/shavon-photo-1.webp');
    expect(screen.getByText('1 / 12')).toBeTruthy();
  });

  it('can navigate and close the inline photo viewer', async () => {
    const { default: Page } = await import('./page');
    render(<Page />);

    fireEvent.click(screen.getByText('open photo'));
    fireEvent.click(await screen.findByRole('button', { name: 'Next photo' }));

    expect(screen.getByRole('dialog', { name: 'Shavon Lloyd photo 2' })).toBeTruthy();
    expect(screen.getByText('2 / 12')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Close selected photo' }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('gallery helpers', () => {
  it('normalizes unusually tall images', () => {
    expect(normalizeGalleryDimensions(500, 1200)).toEqual({
      width: 1200,
      height: 1800,
    });
  });

  it('normalizes unusually wide images', () => {
    expect(normalizeGalleryDimensions(2200, 1000)).toEqual({
      width: 1600,
      height: 1000,
    });
  });

  it('maps gallery images to lightbox and album photos', () => {
    expect(
      mapGalleryImagesToPhotos([
        {
          id: 'img-1',
          name: 'Poster image',
          url: 'https://cdn.example.com/poster.jpg',
          thumbnailUrl: 'https://cdn.example.com/thumbs/poster.jpg',
          width: 1000,
          height: 1000,
          thumbnailWidth: 500,
          thumbnailHeight: 500,
        },
      ])
    ).toEqual([
      {
        src: 'https://cdn.example.com/poster.jpg',
        alt: 'Poster image',
        width: 1000,
        height: 1000,
      },
    ]);
  });

  it('maps thumbnails when requested', () => {
    expect(
      mapGalleryImagesToPhotos(
        [
          {
            id: 'img-1',
            name: 'Poster image',
            url: 'https://cdn.example.com/poster.jpg',
            thumbnailUrl: 'https://cdn.example.com/thumbs/poster.jpg',
            width: 1000,
            height: 1000,
            thumbnailWidth: 500,
            thumbnailHeight: 500,
          },
        ],
        'thumbnail'
      )
    ).toEqual([
      {
        src: 'https://cdn.example.com/thumbs/poster.jpg',
        alt: 'Poster image',
        width: 1000,
        height: 1000,
      },
    ]);
  });
});

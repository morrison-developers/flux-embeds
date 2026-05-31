// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mapGalleryImagesToPhotos,
  normalizeGalleryDimensions,
} from './gallery';

const masonryAlbum = vi.fn();
const lightbox = vi.fn();

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

vi.mock('yet-another-react-lightbox', () => ({
  default: (props: { open: boolean; index: number }) => {
    lightbox(props);
    return props.open ? <div data-testid="lightbox">lightbox:{props.index}</div> : null;
  },
}));

describe('shavon lloyd gallery page', () => {
  beforeEach(() => {
    masonryAlbum.mockReset();
    lightbox.mockReset();
    vi.restoreAllMocks();
  });

  it('renders the local gallery and opens full-size images in the lightbox', async () => {
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

    await waitFor(() => {
      expect(screen.getByTestId('lightbox').textContent).toBe('lightbox:0');
    });

    expect(lightbox).toHaveBeenLastCalledWith(
      expect.objectContaining({
        slides: expect.arrayContaining([
          expect.objectContaining({ src: '/gallery/shavon-photo-1.webp' }),
        ]),
      })
    );
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

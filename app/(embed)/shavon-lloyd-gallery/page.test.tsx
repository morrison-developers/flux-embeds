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

  it('renders loading state before gallery data resolves', async () => {
    let resolveFetch: ((value: Response) => void) | null = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );

    const { default: Page } = await import('./page');
    render(<Page />);

    expect(screen.getByText('Loading gallery...')).toBeTruthy();

    if (!resolveFetch) {
      throw new Error('fetch resolver was not captured');
    }

    const completeFetch: (value: Response) => void = resolveFetch;

    completeFetch(
      new Response(JSON.stringify({ folderName: 'Gallery', images: [] }), { status: 200 })
    );

    await waitFor(() => {
      expect(screen.getByTestId('photo-count').textContent).toBe('0');
    });
  });

  it('renders an error state when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('boom', { status: 500, statusText: 'Server Error' })
    );

    const { default: Page } = await import('./page');
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('Error loading gallery')).toBeTruthy();
    });
  });

  it('renders the gallery heading and opens the lightbox on click', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          folderName: 'Media Gallery',
          images: [
            {
              id: 'img-1',
              name: 'img-1',
              url: 'https://cdn.example.com/image-1.jpg',
              width: 1200,
              height: 800,
            },
          ],
        }),
        { status: 200 }
      )
    );

    const { default: Page } = await import('./page');
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('Media Gallery')).toBeTruthy();
    });

    expect(screen.getByTestId('photo-count').textContent).toBe('1');
    fireEvent.click(screen.getByText('open photo'));

    await waitFor(() => {
      expect(screen.getByTestId('lightbox').textContent).toBe('lightbox:0');
    });
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
          width: 1000,
          height: 1000,
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
});

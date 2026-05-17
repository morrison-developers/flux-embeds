// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useSearchParamsMock = vi.fn();

vi.mock('../_shared/EmbedShell', () => ({
  EmbedShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => useSearchParamsMock(),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  useSearchParamsMock.mockReturnValue(new URLSearchParams());
});

describe('shavon lloyd instagram page', () => {
  it('renders loading state before Instagram data resolves', async () => {
    let resolveFetch: ((value: Response) => void) | null = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );

    const { default: Page } = await import('./page');
    render(<Page />);

    expect(screen.getByText('Loading Instagram...')).toBeTruthy();

    if (!resolveFetch) throw new Error('fetch resolver was not captured');

    const completeFetch: (value: Response) => void = resolveFetch;

    completeFetch(
      new Response(
        JSON.stringify({
          username: 'shavonlloyd',
          profileUrl: 'https://www.instagram.com/shavonlloyd/',
          media: [],
          connected: false,
        }),
        { status: 200 }
      )
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'View on Instagram' })).toBeTruthy();
    });
  });

  it('renders Instagram tiles that open posts in a new tab', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          username: 'shavonlloyd',
          profileUrl: 'https://www.instagram.com/shavonlloyd/',
          connected: true,
          media: [
            {
              id: 'media-1',
              caption: 'Concert poster',
              mediaType: 'IMAGE',
              mediaUrl: 'https://cdn.example.com/poster.jpg',
              permalink: 'https://www.instagram.com/p/poster/',
              thumbnailUrl: null,
              timestamp: '2026-05-01T12:00:00+0000',
            },
          ],
        }),
        { status: 200 }
      )
    );

    const { default: Page } = await import('./page');
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Concert poster' })).toBeTruthy();
    });

    const post = screen.getByRole('link', { name: 'Concert poster' });
    expect(post.getAttribute('href')).toBe('https://www.instagram.com/p/poster/');
    expect(post.getAttribute('target')).toBe('_blank');
    expect(screen.getByAltText('Concert poster')).toBeTruthy();
  });

  it('forwards the limit query param to the feature api', async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('limit=6'));
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          username: 'shavonlloyd',
          profileUrl: 'https://www.instagram.com/shavonlloyd/',
          media: [],
          connected: false,
        }),
        { status: 200 }
      )
    );

    const { default: Page } = await import('./page');
    render(<Page />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/features/shavon-lloyd-instagram?limit=6',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });

  it('renders an error state when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('boom', { status: 500, statusText: 'Server Error' })
    );

    const { default: Page } = await import('./page');
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('Unable to load Instagram')).toBeTruthy();
    });
  });
});

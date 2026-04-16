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

describe('shavon lloyd shopify embed page', () => {
  it('renders loading state before collection data resolves', async () => {
    let resolveFetch: ((value: Response) => void) | null = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );

    const { default: Page } = await import('./page');
    render(<Page />);

    expect(screen.getByText('Loading collection...')).toBeTruthy();

    if (!resolveFetch) throw new Error('fetch resolver was not captured');

    resolveFetch(
      new Response(
        JSON.stringify({
          title: 'All Works',
          handle: 'frontpage',
          products: [],
        }),
        { status: 200 }
      )
    );

    await waitFor(() => {
      expect(
        screen.getByText('No published products are available in this collection yet.')
      ).toBeTruthy();
    });
  });

  it('renders an error state when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('boom', { status: 500, statusText: 'Server Error' })
    );

    const { default: Page } = await import('./page');
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('Unable to load collection')).toBeTruthy();
    });
  });

  it('renders collection cards and opens product links in a new tab', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          title: 'All Works',
          handle: 'frontpage',
          products: [
            {
              id: 'gid://shopify/Product/1',
              title: 'River',
              handle: 'river',
              onlineStoreUrl: 'https://shop.example.com/products/river',
              image: {
                url: 'https://cdn.example.com/river.jpg',
                altText: 'River artwork',
                width: 1200,
                height: 1600,
              },
              price: {
                amount: '350.00',
                currencyCode: 'USD',
              },
            },
          ],
        }),
        { status: 200 }
      )
    );

    const { default: Page } = await import('./page');
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /river/i })).toBeTruthy();
    });

    const link = screen.getByRole('link', { name: /river/i });
    expect(link.getAttribute('href')).toBe('https://shop.example.com/products/river');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(screen.getByText('View in store')).toBeTruthy();
  });

  it('renders an intentional empty state when the collection has no products', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          title: 'All Works',
          handle: 'frontpage',
          products: [],
        }),
        { status: 200 }
      )
    );

    const { default: Page } = await import('./page');
    render(<Page />);

    await waitFor(() => {
      expect(
        screen.getByText('No published products are available in this collection yet.')
      ).toBeTruthy();
    });
  });

  it('forwards the handle query param to the feature api', async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('handle=originals'));
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          title: 'Originals',
          handle: 'originals',
          products: [],
        }),
        { status: 200 }
      )
    );

    const { default: Page } = await import('./page');
    render(<Page />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/features/shavon-lloyd-shopify-embed?handle=originals',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });
});

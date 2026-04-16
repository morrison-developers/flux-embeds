import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

beforeEach(() => {
  process.env.SHOPIFY_STORE_DOMAIN = 'shop.example.com';
  process.env.SHOPIFY_STOREFRONT_API_TOKEN = 'token';
  process.env.SHOPIFY_ONLINE_STORE_DOMAIN = 'shop.example.com';
  delete process.env.SHOPIFY_STOREFRONT_API_VERSION;
  fetchMock.mockReset();
  vi.restoreAllMocks();
  vi.spyOn(globalThis, 'fetch').mockImplementation(fetchMock);
});

describe('shavon lloyd shopify embed route', () => {
  it('returns normalized collection data from Shopify', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            collectionByHandle: {
              title: 'All Works',
              handle: 'frontpage',
              products: {
                edges: [
                  {
                    node: {
                      id: 'gid://shopify/Product/1',
                      title: 'River',
                      handle: 'river',
                      onlineStoreUrl: 'https://shop.example.com/products/river',
                      featuredImage: {
                        url: 'https://cdn.example.com/river.jpg',
                        altText: 'River piece',
                        width: 1200,
                        height: 1600,
                      },
                      priceRange: {
                        minVariantPrice: {
                          amount: '350.00',
                          currencyCode: 'USD',
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        }),
        { status: 200 }
      )
    );

    const { GET } = await import('./route');
    const res = await GET(
      new Request('http://localhost/api/features/shavon-lloyd-shopify-embed')
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
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
            altText: 'River piece',
            width: 1200,
            height: 1600,
          },
          price: {
            amount: '350.00',
            currencyCode: 'USD',
          },
        },
      ],
    });
  });

  it('defaults to frontpage when no handle is provided', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            collectionByHandle: {
              title: 'All Works',
              handle: 'frontpage',
              products: { edges: [] },
            },
          },
        }),
        { status: 200 }
      )
    );

    const { GET } = await import('./route');
    await GET(new Request('http://localhost/api/features/shavon-lloyd-shopify-embed'));

    expect(fetchMock).toHaveBeenCalledWith(
      'https://shop.example.com/api/2026-01/graphql.json',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"handle":"frontpage"'),
      })
    );
  });

  it('forwards a custom handle query param', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            collectionByHandle: {
              title: 'Originals',
              handle: 'originals',
              products: { edges: [] },
            },
          },
        }),
        { status: 200 }
      )
    );

    const { GET } = await import('./route');
    await GET(
      new Request(
        'http://localhost/api/features/shavon-lloyd-shopify-embed?handle=originals'
      )
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://shop.example.com/api/2026-01/graphql.json',
      expect.objectContaining({
        body: expect.stringContaining('"handle":"originals"'),
      })
    );
  });

  it('falls back to the storefront domain when onlineStoreUrl is missing', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            collectionByHandle: {
              title: 'All Works',
              handle: 'frontpage',
              products: {
                edges: [
                  {
                    node: {
                      id: 'gid://shopify/Product/1',
                      title: 'Shown',
                      handle: 'shown',
                      onlineStoreUrl: 'https://shop.example.com/products/shown',
                    },
                  },
                  {
                    node: {
                      id: 'gid://shopify/Product/2',
                      title: 'Hidden',
                      handle: 'hidden',
                      onlineStoreUrl: null,
                    },
                  },
                ],
              },
            },
          },
        }),
        { status: 200 }
      )
    );

    const { GET } = await import('./route');
    const res = await GET(
      new Request('http://localhost/api/features/shavon-lloyd-shopify-embed')
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.products).toHaveLength(2);
    expect(body.products[0].handle).toBe('shown');
    expect(body.products[1]).toEqual(
      expect.objectContaining({
        handle: 'hidden',
        onlineStoreUrl: 'https://shop.example.com/products/hidden',
      })
    );
  });

  it('includes debug counts and raw product visibility when debug=1', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            collectionByHandle: {
              title: 'All Works',
              handle: 'frontpage',
              products: {
                edges: [
                  {
                    node: {
                      id: 'gid://shopify/Product/1',
                      title: 'Shown',
                      handle: 'shown',
                      onlineStoreUrl: 'https://shop.example.com/products/shown',
                    },
                  },
                  {
                    node: {
                      id: 'gid://shopify/Product/2',
                      title: 'Hidden',
                      handle: 'hidden',
                      onlineStoreUrl: null,
                    },
                  },
                ],
              },
            },
          },
        }),
        { status: 200 }
      )
    );

    const { GET } = await import('./route');
    const res = await GET(
      new Request(
        'http://localhost/api/features/shavon-lloyd-shopify-embed?handle=frontpage&debug=1'
      )
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.debug).toEqual({
      totalProducts: 2,
      productsWithOnlineStoreUrl: 1,
      rawProducts: [
        {
          title: 'Shown',
          handle: 'shown',
          hasOnlineStoreUrl: true,
          onlineStoreUrl: 'https://shop.example.com/products/shown',
        },
        {
          title: 'Hidden',
          handle: 'hidden',
          hasOnlineStoreUrl: false,
          onlineStoreUrl: null,
        },
      ],
    });
  });

  it('returns 404 when the collection is missing', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { collectionByHandle: null } }), { status: 200 })
    );

    const { GET } = await import('./route');
    const res = await GET(
      new Request('http://localhost/api/features/shavon-lloyd-shopify-embed')
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({
      ok: false,
      error: 'Collection not found.',
      code: 'NOT_FOUND',
    });
  });

  it('returns 500 when Shopify env is missing', async () => {
    delete process.env.SHOPIFY_STOREFRONT_API_TOKEN;

    const { GET } = await import('./route');
    const res = await GET(
      new Request('http://localhost/api/features/shavon-lloyd-shopify-embed')
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({
      ok: false,
      error: 'Failed to fetch collection.',
      code: 'INTERNAL',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 500 when Shopify responds with an error status', async () => {
    fetchMock.mockResolvedValue(new Response('bad gateway', { status: 502 }));

    const { GET } = await import('./route');
    const res = await GET(
      new Request('http://localhost/api/features/shavon-lloyd-shopify-embed')
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({
      ok: false,
      error: 'Failed to fetch collection.',
      code: 'INTERNAL',
    });
  });

  it('returns 500 when Shopify payload is malformed', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { collectionByHandle: { title: 'Broken' } } }), {
        status: 200,
      })
    );

    const { GET } = await import('./route');
    const res = await GET(
      new Request('http://localhost/api/features/shavon-lloyd-shopify-embed')
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({
      ok: false,
      error: 'Failed to fetch collection.',
      code: 'INTERNAL',
    });
  });
});

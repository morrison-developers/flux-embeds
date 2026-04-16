import { describe, expect, it } from 'vitest';
import {
  normalizeShopifyEmbedCollection,
  normalizeShopifyEmbedProduct,
} from './embed';

describe('shopify embed helpers', () => {
  it('normalizes a product with image and price fields', () => {
    expect(
      normalizeShopifyEmbedProduct({
        id: 'gid://shopify/Product/1',
        title: 'Sunset Study',
        handle: 'sunset-study',
        onlineStoreUrl: 'https://shop.example.com/products/sunset-study',
        featuredImage: {
          url: 'https://cdn.example.com/sunset.jpg',
          altText: 'Sunset painting',
          width: 1200,
          height: 1500,
        },
        priceRange: {
          minVariantPrice: {
            amount: '450.00',
            currencyCode: 'USD',
          },
        },
      })
    ).toEqual({
      id: 'gid://shopify/Product/1',
      title: 'Sunset Study',
      handle: 'sunset-study',
      onlineStoreUrl: 'https://shop.example.com/products/sunset-study',
      image: {
        url: 'https://cdn.example.com/sunset.jpg',
        altText: 'Sunset painting',
        width: 1200,
        height: 1500,
      },
      price: {
        amount: '450.00',
        currencyCode: 'USD',
      },
    });
  });

  it('returns null for products missing onlineStoreUrl', () => {
    expect(
      normalizeShopifyEmbedProduct({
        id: 'gid://shopify/Product/2',
        title: 'Unpublished Work',
        handle: 'unpublished-work',
      })
    ).toBeNull();
  });

  it('falls back to the storefront domain when onlineStoreUrl is missing', () => {
    expect(
      normalizeShopifyEmbedProduct(
        {
          id: 'gid://shopify/Product/2',
          title: 'Tell Me',
          handle: 'tell-me',
        },
        'shop.shavonlloyd.com'
      )
    ).toEqual({
      id: 'gid://shopify/Product/2',
      title: 'Tell Me',
      handle: 'tell-me',
      onlineStoreUrl: 'https://shop.shavonlloyd.com/products/tell-me',
      image: null,
      price: null,
    });
  });

  it('keeps image and price null-safe', () => {
    expect(
      normalizeShopifyEmbedProduct({
        id: 'gid://shopify/Product/3',
        title: 'Untitled',
        handle: 'untitled',
        onlineStoreUrl: 'https://shop.example.com/products/untitled',
        featuredImage: null,
        priceRange: {
          minVariantPrice: {
            amount: 200,
            currencyCode: 'USD',
          },
        },
      })
    ).toEqual({
      id: 'gid://shopify/Product/3',
      title: 'Untitled',
      handle: 'untitled',
      onlineStoreUrl: 'https://shop.example.com/products/untitled',
      image: null,
      price: null,
    });
  });

  it('normalizes a collection and filters invalid products', () => {
    expect(
      normalizeShopifyEmbedCollection({
        title: 'All Works',
        handle: 'all-works',
        products: {
          edges: [
            {
              node: {
                id: 'gid://shopify/Product/1',
                title: 'Published Work',
                handle: 'published-work',
                onlineStoreUrl: 'https://shop.example.com/products/published-work',
              },
            },
            {
              node: {
                id: 'gid://shopify/Product/2',
                title: 'Hidden Work',
                handle: 'hidden-work',
              },
            },
          ],
        },
      })
    ).toEqual({
      title: 'All Works',
      handle: 'all-works',
      products: [
        {
          id: 'gid://shopify/Product/1',
          title: 'Published Work',
          handle: 'published-work',
          onlineStoreUrl: 'https://shop.example.com/products/published-work',
          image: null,
          price: null,
        },
      ],
    });
  });

  it('uses the storefront domain fallback across collection products', () => {
    expect(
      normalizeShopifyEmbedCollection(
        {
          title: 'All Works',
          handle: 'frontpage',
          products: {
            edges: [
              {
                node: {
                  id: 'gid://shopify/Product/1',
                  title: 'Tell Me',
                  handle: 'tell-me',
                },
              },
            ],
          },
        },
        'https://shop.shavonlloyd.com'
      )
    ).toEqual({
      title: 'All Works',
      handle: 'frontpage',
      products: [
        {
          id: 'gid://shopify/Product/1',
          title: 'Tell Me',
          handle: 'tell-me',
          onlineStoreUrl: 'https://shop.shavonlloyd.com/products/tell-me',
          image: null,
          price: null,
        },
      ],
    });
  });
});

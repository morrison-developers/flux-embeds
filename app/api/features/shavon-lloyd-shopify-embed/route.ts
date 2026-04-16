import { NextResponse } from 'next/server';
import {
  normalizeShopifyEmbedCollection,
  SHOPIFY_COLLECTION_PAGE_SIZE,
  summarizeShopifyEmbedCollection,
} from '@/src/domain/shopify/embed';
import { apiError } from '@/src/server/api/errors';
import {
  isEnvConfigError,
  validateShopifyStorefrontEnv,
} from '@/src/server/env';

const COLLECTION_QUERY = `
  query CollectionByHandle($handle: String!, $first: Int!) {
    collectionByHandle(handle: $handle) {
      title
      handle
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            onlineStoreUrl
            featuredImage {
              url
              altText
              width
              height
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  }
`;

type ShopifyGraphQLResponse = {
  data?: {
    collectionByHandle?: unknown;
  };
  errors?: unknown;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const handle = url.searchParams.get('handle')?.trim() || 'frontpage';
  const debug = url.searchParams.get('debug') === '1';

  try {
    const env = validateShopifyStorefrontEnv();

    const response = await fetch(
      `https://${env.storeDomain}/api/${env.apiVersion}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-shopify-storefront-access-token': env.storefrontApiToken,
        },
        body: JSON.stringify({
          query: COLLECTION_QUERY,
          variables: {
            handle,
            first: SHOPIFY_COLLECTION_PAGE_SIZE,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Shopify Storefront API failed with ${response.status}`);
    }

    const body = (await response.json()) as ShopifyGraphQLResponse;
    if (Array.isArray(body.errors) && body.errors.length > 0) {
      throw new Error('Shopify Storefront API returned GraphQL errors');
    }

    if (body.data?.collectionByHandle == null) {
      return apiError(404, 'Collection not found.', 'NOT_FOUND');
    }

    const collection = normalizeShopifyEmbedCollection(
      body.data.collectionByHandle,
      env.onlineStoreDomain
    );
    if (!collection) {
      throw new Error('Shopify Storefront API returned a malformed collection payload');
    }

    if (debug) {
      return NextResponse.json({
        ...collection,
        debug: summarizeShopifyEmbedCollection(body.data.collectionByHandle),
      });
    }

    return NextResponse.json(collection);
  } catch (error) {
    if (isEnvConfigError(error)) {
      console.error('[shavon-lloyd-shopify-embed] missing Shopify env', error);
    } else {
      console.error('[shavon-lloyd-shopify-embed] failed to fetch collection', error);
    }

    return apiError(500, 'Failed to fetch collection.', 'INTERNAL');
  }
}

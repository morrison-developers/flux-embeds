export const SHOPIFY_COLLECTION_PAGE_SIZE = 24;

export type ShopifyEmbedProduct = {
  id: string;
  title: string;
  handle: string;
  onlineStoreUrl: string;
  image: {
    url: string;
    altText: string | null;
    width: number | null;
    height: number | null;
  } | null;
  price: {
    amount: string;
    currencyCode: string;
  } | null;
};

export type ShopifyEmbedCollectionResponse = {
  title: string;
  handle: string;
  products: ShopifyEmbedProduct[];
};

export type ShopifyEmbedProductDebug = {
  title: string | null;
  handle: string | null;
  hasOnlineStoreUrl: boolean;
  onlineStoreUrl: string | null;
};

type ShopifyMoneyV2Like = {
  amount?: unknown;
  currencyCode?: unknown;
};

type ShopifyImageLike = {
  url?: unknown;
  altText?: unknown;
  width?: unknown;
  height?: unknown;
};

type ShopifyProductLike = {
  id?: unknown;
  title?: unknown;
  handle?: unknown;
  onlineStoreUrl?: unknown;
  featuredImage?: ShopifyImageLike | null;
  priceRange?: {
    minVariantPrice?: ShopifyMoneyV2Like | null;
  } | null;
};

type ShopifyCollectionLike = {
  title?: unknown;
  handle?: unknown;
  products?: {
    edges?: Array<{ node?: ShopifyProductLike | null } | null>;
  } | null;
};

function normalizeStorefrontBaseUrl(rawDomain: string) {
  const trimmed = rawDomain.trim().replace(/\/+$/, '');
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function normalizeProductImage(featuredImage: ShopifyImageLike | null | undefined) {
  if (!featuredImage || typeof featuredImage.url !== 'string') {
    return null;
  }

  return {
    url: featuredImage.url,
    altText: typeof featuredImage.altText === 'string' ? featuredImage.altText : null,
    width: typeof featuredImage.width === 'number' ? featuredImage.width : null,
    height: typeof featuredImage.height === 'number' ? featuredImage.height : null,
  };
}

function normalizeProductPrice(price: ShopifyMoneyV2Like | null | undefined) {
  if (
    !price ||
    typeof price.amount !== 'string' ||
    typeof price.currencyCode !== 'string'
  ) {
    return null;
  }

  return {
    amount: price.amount,
    currencyCode: price.currencyCode,
  };
}

export function normalizeShopifyEmbedProduct(
  product: ShopifyProductLike | null | undefined,
  onlineStoreDomain?: string
): ShopifyEmbedProduct | null {
  const fallbackUrl =
    onlineStoreDomain && typeof product?.handle === 'string'
      ? `${normalizeStorefrontBaseUrl(onlineStoreDomain)}/products/${product.handle}`
      : null;
  const productUrl =
    typeof product?.onlineStoreUrl === 'string' ? product.onlineStoreUrl : fallbackUrl;

  if (
    !product ||
    typeof product.id !== 'string' ||
    typeof product.title !== 'string' ||
    typeof product.handle !== 'string' ||
    typeof productUrl !== 'string'
  ) {
    return null;
  }

  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    onlineStoreUrl: productUrl,
    image: normalizeProductImage(product.featuredImage),
    price: normalizeProductPrice(product.priceRange?.minVariantPrice),
  };
}

export function normalizeShopifyEmbedCollection(
  collection: ShopifyCollectionLike | null | undefined,
  onlineStoreDomain?: string
): ShopifyEmbedCollectionResponse | null {
  if (
    !collection ||
    typeof collection.title !== 'string' ||
    typeof collection.handle !== 'string'
  ) {
    return null;
  }

  return {
    title: collection.title,
    handle: collection.handle,
    products: (collection.products?.edges ?? [])
      .map((edge) => normalizeShopifyEmbedProduct(edge?.node, onlineStoreDomain))
      .filter((product): product is ShopifyEmbedProduct => product !== null),
  };
}

export function summarizeShopifyEmbedCollection(
  collection: ShopifyCollectionLike | null | undefined
) {
  const edges = collection?.products?.edges ?? [];

  return {
    totalProducts: edges.length,
    productsWithOnlineStoreUrl: edges.filter((edge) => {
      const url = edge?.node?.onlineStoreUrl;
      return typeof url === 'string' && url.length > 0;
    }).length,
    rawProducts: edges.map((edge): ShopifyEmbedProductDebug => {
      const node = edge?.node;
      return {
        title: typeof node?.title === 'string' ? node.title : null,
        handle: typeof node?.handle === 'string' ? node.handle : null,
        hasOnlineStoreUrl: typeof node?.onlineStoreUrl === 'string',
        onlineStoreUrl:
          typeof node?.onlineStoreUrl === 'string' ? node.onlineStoreUrl : null,
      };
    }),
  };
}

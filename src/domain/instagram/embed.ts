export const INSTAGRAM_DEFAULT_USERNAME = 'shavonlloyd';
export const INSTAGRAM_DEFAULT_MEDIA_LIMIT = 10;
export const INSTAGRAM_MAX_MEDIA_LIMIT = 24;

export type InstagramMediaItem = {
  id: string;
  caption: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  mediaUrl: string;
  permalink: string;
  thumbnailUrl: string | null;
  timestamp: string | null;
};

export type InstagramFeed = {
  username: string;
  profileUrl: string;
  media: InstagramMediaItem[];
  connected: boolean;
};

type InstagramGraphMedia = {
  id?: unknown;
  caption?: unknown;
  media_type?: unknown;
  media_url?: unknown;
  permalink?: unknown;
  thumbnail_url?: unknown;
  timestamp?: unknown;
};

export function normalizeInstagramUsername(value: string | undefined) {
  const username = value?.trim().replace(/^@/, '');
  return username || INSTAGRAM_DEFAULT_USERNAME;
}

export function buildInstagramProfileUrl(username: string, override?: string) {
  const trimmedOverride = override?.trim();
  if (trimmedOverride) return trimmedOverride;

  return `https://www.instagram.com/${encodeURIComponent(username)}/`;
}

export function parseInstagramLimit(value: string | null) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return INSTAGRAM_DEFAULT_MEDIA_LIMIT;
  return Math.min(Math.max(parsed, 1), INSTAGRAM_MAX_MEDIA_LIMIT);
}

function normalizeMediaType(value: unknown): InstagramMediaItem['mediaType'] | null {
  if (value === 'IMAGE' || value === 'VIDEO' || value === 'CAROUSEL_ALBUM') return value;
  return null;
}

export function normalizeInstagramMediaItem(
  item: InstagramGraphMedia
): InstagramMediaItem | null {
  const mediaType = normalizeMediaType(item.media_type);

  if (
    typeof item.id !== 'string' ||
    mediaType == null ||
    typeof item.media_url !== 'string' ||
    typeof item.permalink !== 'string'
  ) {
    return null;
  }

  return {
    id: item.id,
    caption: typeof item.caption === 'string' ? item.caption : '',
    mediaType,
    mediaUrl: item.media_url,
    permalink: item.permalink,
    thumbnailUrl: typeof item.thumbnail_url === 'string' ? item.thumbnail_url : null,
    timestamp: typeof item.timestamp === 'string' ? item.timestamp : null,
  };
}

export function normalizeInstagramMedia(items: unknown): InstagramMediaItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) =>
      item && typeof item === 'object'
        ? normalizeInstagramMediaItem(item as InstagramGraphMedia)
        : null
    )
    .filter((item): item is InstagramMediaItem => item != null);
}

import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';
import {
  buildInstagramProfileUrl,
  normalizeInstagramMedia,
  normalizeInstagramUsername,
  parseInstagramLimit,
} from '@/src/domain/instagram/embed';
import {
  isEnvConfigError,
  validateCloudinaryGalleryEnv,
} from '@/src/server/env';

type InstagramGraphResponse = {
  data?: unknown;
  error?: unknown;
};

type CloudinaryResource = {
  public_id?: unknown;
  secure_url?: unknown;
};

type CloudinaryResourcesResponse = {
  resources?: CloudinaryResource[];
};

function shuffleItems<T>(items: T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

async function fetchInstagramMedia(limit: number, accessToken: string, userId?: string) {
  const fields = [
    'id',
    'caption',
    'media_type',
    'media_url',
    'permalink',
    'thumbnail_url',
    'timestamp',
  ].join(',');
  const graphUrl = new URL(
    userId
      ? `https://graph.facebook.com/v20.0/${encodeURIComponent(userId)}/media`
      : 'https://graph.instagram.com/me/media'
  );
  graphUrl.searchParams.set('fields', fields);
  graphUrl.searchParams.set('limit', String(limit));
  graphUrl.searchParams.set('access_token', accessToken);

  const response = await fetch(graphUrl);
  if (!response.ok) {
    throw new Error(`Instagram Graph API failed with ${response.status}`);
  }

  const body = (await response.json()) as InstagramGraphResponse;
  if (body.error) {
    throw new Error('Instagram Graph API returned an error');
  }

  return normalizeInstagramMedia(body.data);
}

async function fetchFallbackMedia(limit: number, profileUrl: string) {
  try {
    const env = validateCloudinaryGalleryEnv();
    const fetchLimit = Math.max(limit * 4, 24);

    cloudinary.config({
      cloud_name: env.cloudName,
      api_key: env.apiKey,
      api_secret: env.apiSecret,
    });

    const response = (await cloudinary.api.resources({
      type: 'upload',
      resource_type: 'image',
      max_results: fetchLimit,
      ...(env.prefix ? { prefix: env.prefix } : {}),
    })) as CloudinaryResourcesResponse;

    return shuffleItems(response.resources ?? []).flatMap((resource) => {
      if (
        typeof resource.public_id !== 'string' ||
        typeof resource.secure_url !== 'string'
      ) {
        return [];
      }

      return [
        {
          id: resource.public_id,
          caption: 'Open Instagram profile',
          mediaType: 'IMAGE' as const,
          mediaUrl: resource.secure_url,
          permalink: profileUrl,
          thumbnailUrl: null,
          timestamp: null,
        },
      ];
    }).slice(0, limit);
  } catch (error) {
    if (!isEnvConfigError(error)) {
      console.error('[shavon-lloyd-instagram] failed to fetch fallback media', error);
    }

    return [];
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = parseInstagramLimit(url.searchParams.get('limit'));
  const username = normalizeInstagramUsername(process.env.INSTAGRAM_USERNAME);
  const profileUrl = buildInstagramProfileUrl(username, process.env.INSTAGRAM_PROFILE_URL);
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  const userId = process.env.INSTAGRAM_USER_ID?.trim();

  if (accessToken) {
    try {
      const media = await fetchInstagramMedia(limit, accessToken, userId);

      if (media.length > 0) {
        return NextResponse.json({
          username,
          profileUrl,
          media,
          connected: true,
        });
      }
    } catch (error) {
      console.error('[shavon-lloyd-instagram] failed to fetch Instagram media', error);
    }
  }

  const media = await fetchFallbackMedia(Math.min(limit, 6), profileUrl);
  return NextResponse.json({
    username,
    profileUrl,
    media,
    connected: false,
  });
}

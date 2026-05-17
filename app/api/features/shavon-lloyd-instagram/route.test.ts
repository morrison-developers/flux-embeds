import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';
import {
  buildInstagramProfileUrl,
  normalizeInstagramMedia,
  normalizeInstagramUsername,
  parseInstagramLimit,
} from '@/src/domain/instagram/embed';

const cloudinaryMocks = vi.hoisted(() => ({
  resources: vi.fn(),
  config: vi.fn(),
}));

vi.mock('cloudinary', () => ({
  v2: {
    config: cloudinaryMocks.config,
    api: {
      resources: cloudinaryMocks.resources,
    },
  },
}));

beforeEach(() => {
  vi.restoreAllMocks();
  process.env.CLOUDINARY_CLOUD_NAME = 'cloud';
  process.env.CLOUDINARY_API_KEY = 'key';
  process.env.CLOUDINARY_API_SECRET = 'secret';
  delete process.env.INSTAGRAM_ACCESS_TOKEN;
  delete process.env.INSTAGRAM_USERNAME;
  delete process.env.INSTAGRAM_PROFILE_URL;
  delete process.env.INSTAGRAM_USER_ID;
  delete process.env.CLOUDINARY_GALLERY_PREFIX;
  cloudinaryMocks.resources.mockReset();
  cloudinaryMocks.config.mockReset();
});

describe('shavon lloyd instagram api route', () => {
  it('returns Cloudinary fallback media when no access token is configured', async () => {
    cloudinaryMocks.resources.mockResolvedValue({
      resources: [
        {
          public_id: 'gallery/image-1',
          secure_url: 'https://cdn.example.com/image-1.jpg',
        },
      ],
    });

    const response = await GET(
      new Request('https://example.com/api/features/shavon-lloyd-instagram')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(cloudinaryMocks.config).toHaveBeenCalledWith({
      cloud_name: 'cloud',
      api_key: 'key',
      api_secret: 'secret',
    });
    expect(body).toEqual({
      username: 'shavonlloyd',
      profileUrl: 'https://www.instagram.com/shavonlloyd/',
      connected: false,
      media: [
        {
          id: 'gallery/image-1',
          caption: 'Open Instagram profile',
          mediaType: 'IMAGE',
          mediaUrl: 'https://cdn.example.com/image-1.jpg',
          permalink: 'https://www.instagram.com/shavonlloyd/',
          thumbnailUrl: null,
          timestamp: null,
        },
      ],
    });
  });

  it('fetches Instagram Basic Display media with a clamped limit', async () => {
    process.env.INSTAGRAM_ACCESS_TOKEN = 'token';
    process.env.INSTAGRAM_USERNAME = '@shavonlloyd';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 'media-1',
              caption: 'Poster',
              media_type: 'IMAGE',
              media_url: 'https://cdn.example.com/poster.jpg',
              permalink: 'https://www.instagram.com/p/poster/',
              timestamp: '2026-05-01T12:00:00+0000',
            },
          ],
        }),
        { status: 200 }
      )
    );

    const response = await GET(
      new Request('https://example.com/api/features/shavon-lloyd-instagram?limit=200')
    );
    const body = await response.json();
    const calledUrl = fetchSpy.mock.calls[0]?.[0];

    expect(response.status).toBe(200);
    expect(body.connected).toBe(true);
    expect(body.media).toHaveLength(1);
    expect(body.media[0].caption).toBe('Poster');
    expect(calledUrl).toBeInstanceOf(URL);
    expect((calledUrl as URL).searchParams.get('limit')).toBe('24');
    expect((calledUrl as URL).searchParams.get('access_token')).toBe('token');
    expect((calledUrl as URL).origin).toBe('https://graph.instagram.com');
    expect(cloudinaryMocks.resources).not.toHaveBeenCalled();
  });

  it('fetches Instagram business media by user id when configured', async () => {
    process.env.INSTAGRAM_ACCESS_TOKEN = 'token';
    process.env.INSTAGRAM_USER_ID = '17841400000000000';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 'media-1',
              media_type: 'IMAGE',
              media_url: 'https://cdn.example.com/instagram.jpg',
              permalink: 'https://www.instagram.com/p/instagram/',
            },
          ],
        }),
        { status: 200 }
      )
    );

    const response = await GET(
      new Request('https://example.com/api/features/shavon-lloyd-instagram?limit=6')
    );
    const calledUrl = fetchSpy.mock.calls[0]?.[0];

    expect(response.status).toBe(200);
    expect(calledUrl).toBeInstanceOf(URL);
    expect((calledUrl as URL).toString()).toContain(
      'https://graph.facebook.com/v20.0/17841400000000000/media'
    );
    expect((calledUrl as URL).searchParams.get('limit')).toBe('6');
    expect(cloudinaryMocks.resources).not.toHaveBeenCalled();
  });

  it('falls back to Cloudinary when Instagram fails', async () => {
    process.env.INSTAGRAM_ACCESS_TOKEN = 'token';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 500 }));
    cloudinaryMocks.resources.mockResolvedValue({
      resources: [
        {
          public_id: 'gallery/image-1',
          secure_url: 'https://cdn.example.com/image-1.jpg',
        },
      ],
    });

    const response = await GET(
      new Request('https://example.com/api/features/shavon-lloyd-instagram')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.connected).toBe(false);
    expect(body.media).toHaveLength(1);
    expect(body.media[0].permalink).toBe('https://www.instagram.com/shavonlloyd/');
  });

  it('fetches a larger fallback pool but only returns six images', async () => {
    cloudinaryMocks.resources.mockResolvedValue({
      resources: Array.from({ length: 10 }, (_, index) => ({
        public_id: `gallery/image-${index + 1}`,
        secure_url: `https://cdn.example.com/image-${index + 1}.jpg`,
      })),
    });

    const response = await GET(
      new Request('https://example.com/api/features/shavon-lloyd-instagram?limit=24')
    );
    const body = await response.json();

    expect(cloudinaryMocks.resources).toHaveBeenCalledWith({
      type: 'upload',
      resource_type: 'image',
      max_results: 24,
    });
    expect(body.media).toHaveLength(6);
  });
});

describe('instagram embed helpers', () => {
  it('normalizes usernames and profile urls', () => {
    expect(normalizeInstagramUsername('@shavonlloyd')).toBe('shavonlloyd');
    expect(normalizeInstagramUsername('')).toBe('shavonlloyd');
    expect(buildInstagramProfileUrl('shavonlloyd')).toBe(
      'https://www.instagram.com/shavonlloyd/'
    );
    expect(buildInstagramProfileUrl('x', 'https://example.com/profile')).toBe(
      'https://example.com/profile'
    );
  });

  it('parses media limits conservatively', () => {
    expect(parseInstagramLimit(null)).toBe(10);
    expect(parseInstagramLimit('0')).toBe(1);
    expect(parseInstagramLimit('100')).toBe(24);
    expect(parseInstagramLimit('6')).toBe(6);
  });

  it('filters malformed graph media', () => {
    expect(
      normalizeInstagramMedia([
        {
          id: 'media-1',
          media_type: 'VIDEO',
          media_url: 'https://cdn.example.com/video.mp4',
          thumbnail_url: 'https://cdn.example.com/video.jpg',
          permalink: 'https://www.instagram.com/p/video/',
        },
        {
          id: 'media-2',
          media_type: 'STORY',
          media_url: 'https://cdn.example.com/story.jpg',
          permalink: 'https://www.instagram.com/p/story/',
        },
      ])
    ).toEqual([
      {
        id: 'media-1',
        caption: '',
        mediaType: 'VIDEO',
        mediaUrl: 'https://cdn.example.com/video.mp4',
        permalink: 'https://www.instagram.com/p/video/',
        thumbnailUrl: 'https://cdn.example.com/video.jpg',
        timestamp: null,
      },
    ]);
  });
});

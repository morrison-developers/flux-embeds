import { beforeEach, describe, expect, it, vi } from 'vitest';

const resources = vi.fn();
const config = vi.fn();

vi.mock('cloudinary', () => ({
  v2: {
    config,
    api: {
      resources,
    },
  },
}));

beforeEach(() => {
  process.env.CLOUDINARY_CLOUD_NAME = 'cloud';
  process.env.CLOUDINARY_API_KEY = 'key';
  process.env.CLOUDINARY_API_SECRET = 'secret';
  process.env.CLOUDINARY_COLLECTION = 'Shavon Gallery';
  delete process.env.CLOUDINARY_GALLERY_PREFIX;
  resources.mockReset();
  config.mockReset();
});

describe('shavon lloyd gallery route', () => {
  it('returns mapped images from Cloudinary', async () => {
    resources.mockResolvedValue({
      resources: [
        {
          public_id: 'gallery/image-1',
          secure_url: 'https://cdn.example.com/image-1.jpg',
          width: 1200,
          height: 800,
        },
      ],
    });

    const { GET } = await import('./route');
    const res = await GET();
    const body = (await res.json()) as {
      folderName: string;
      images: Array<{ id: string; url: string; width: number; height: number }>;
    };

    expect(res.status).toBe(200);
    expect(config).toHaveBeenCalledWith({
      cloud_name: 'cloud',
      api_key: 'key',
      api_secret: 'secret',
    });
    expect(body.folderName).toBe('Shavon Gallery');
    expect(body.images).toEqual([
      {
        id: 'gallery/image-1',
        name: 'gallery/image-1',
        url: 'https://cdn.example.com/image-1.jpg',
        width: 1200,
        height: 800,
      },
    ]);
  });

  it('paginates until all Cloudinary resources are loaded', async () => {
    resources
      .mockResolvedValueOnce({
        resources: [
          {
            public_id: 'gallery/image-1',
            secure_url: 'https://cdn.example.com/image-1.jpg',
            width: 1200,
            height: 800,
          },
        ],
        next_cursor: 'cursor-2',
      })
      .mockResolvedValueOnce({
        resources: [
          {
            public_id: 'gallery/image-2',
            secure_url: 'https://cdn.example.com/image-2.jpg',
            width: 900,
            height: 1200,
          },
        ],
      });

    const { GET } = await import('./route');
    const res = await GET();
    const body = (await res.json()) as { images: Array<{ id: string }> };

    expect(res.status).toBe(200);
    expect(resources).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ next_cursor: undefined, max_results: 500 })
    );
    expect(resources).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ next_cursor: 'cursor-2', max_results: 500 })
    );
    expect(body.images.map((image) => image.id)).toEqual([
      'gallery/image-1',
      'gallery/image-2',
    ]);
  });

  it('passes through an optional prefix filter', async () => {
    process.env.CLOUDINARY_GALLERY_PREFIX = 'shavon/gallery/';
    resources.mockResolvedValue({ resources: [] });

    const { GET } = await import('./route');
    const res = await GET();

    expect(res.status).toBe(200);
    expect(resources).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: 'shavon/gallery/' })
    );
  });

  it('returns 500 when Cloudinary env is missing', async () => {
    delete process.env.CLOUDINARY_API_SECRET;

    const { GET } = await import('./route');
    const res = await GET();
    const body = (await res.json()) as { ok: boolean; error: string; code?: string };

    expect(res.status).toBe(500);
    expect(body).toEqual({
      ok: false,
      error: 'Failed to fetch gallery.',
      code: 'INTERNAL',
    });
    expect(resources).not.toHaveBeenCalled();
  });

  it('returns 500 when Cloudinary fetch fails', async () => {
    resources.mockRejectedValue(new Error('Cloudinary unavailable'));

    const { GET } = await import('./route');
    const res = await GET();
    const body = (await res.json()) as { ok: boolean; error: string; code?: string };

    expect(res.status).toBe(500);
    expect(body).toEqual({
      ok: false,
      error: 'Failed to fetch gallery.',
      code: 'INTERNAL',
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const createSubmission = vi.fn();
const findManySubmissions = vi.fn();
const sendShavonLloydContactEmail = vi.fn();

vi.mock('@/src/server/prisma', () => ({
  prisma: {
    shavonLloydContactSubmission: {
      create: createSubmission,
      findMany: findManySubmissions,
    },
  },
}));

vi.mock('@/src/server/email/plunk', () => ({
  sendShavonLloydContactEmail,
}));

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://example';
  process.env.SUPERBOWL_ADMIN_TOKEN = 'secret';
  createSubmission.mockReset();
  findManySubmissions.mockReset();
  sendShavonLloydContactEmail.mockReset();
  sendShavonLloydContactEmail.mockResolvedValue(undefined);
});

describe('shavon lloyd contact route', () => {
  it('returns 400 for invalid email', async () => {
    const { POST } = await import('./route');

    const req = new Request('http://localhost/api/features/shavon-lloyd-contact', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-real-ip': '10.0.0.1',
      },
      body: JSON.stringify({
        name: 'Jane',
        email: 'bad-email',
        message: 'This message is long enough',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(createSubmission).not.toHaveBeenCalled();
  });

  it('returns 400 for short message', async () => {
    const { POST } = await import('./route');

    const req = new Request('http://localhost/api/features/shavon-lloyd-contact', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-real-ip': '10.0.0.2',
      },
      body: JSON.stringify({
        name: 'Jane',
        email: 'jane@example.com',
        message: 'short',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(createSubmission).not.toHaveBeenCalled();
  });

  it('returns 400 when honeypot is filled', async () => {
    const { POST } = await import('./route');

    const req = new Request('http://localhost/api/features/shavon-lloyd-contact', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-real-ip': '10.0.0.3',
      },
      body: JSON.stringify({
        name: 'Jane',
        email: 'jane@example.com',
        message: 'This message is long enough',
        website: 'https://spam.example',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(createSubmission).not.toHaveBeenCalled();
  });

  it('returns 429 when throttled', async () => {
    createSubmission.mockResolvedValue({ id: 's1' });
    const { POST } = await import('./route');

    const firstReq = new Request('http://localhost/api/features/shavon-lloyd-contact', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-real-ip': '10.0.0.4',
      },
      body: JSON.stringify({
        name: 'Jane',
        email: 'jane@example.com',
        message: 'This message is long enough',
      }),
    });
    const secondReq = new Request('http://localhost/api/features/shavon-lloyd-contact', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-real-ip': '10.0.0.4',
      },
      body: JSON.stringify({
        name: 'Jane',
        email: 'jane@example.com',
        message: 'This message is long enough',
      }),
    });

    const firstRes = await POST(firstReq);
    const secondRes = await POST(secondReq);

    expect(firstRes.status).toBe(200);
    expect(secondRes.status).toBe(429);
    expect(createSubmission).toHaveBeenCalledTimes(1);
  });

  it('returns 200 and persists valid payload', async () => {
    createSubmission.mockResolvedValue({ id: 's1', createdAt: new Date('2026-03-03T00:00:00Z') });
    const { POST } = await import('./route');

    const req = new Request('http://localhost/api/features/shavon-lloyd-contact', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-real-ip': '10.0.0.5',
        'user-agent': 'vitest',
      },
      body: JSON.stringify({
        name: 'Jane',
        email: 'jane@example.com',
        company: 'Acme',
        message: 'This message is long enough',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(createSubmission).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Jane',
        email: 'jane@example.com',
        company: 'Acme',
        message: 'This message is long enough',
        ip: '10.0.0.5',
        userAgent: 'vitest',
      }),
    });
    expect(sendShavonLloydContactEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        submissionId: 's1',
        name: 'Jane',
        email: 'jane@example.com',
      })
    );
  });

  it('still returns 200 when email notification fails', async () => {
    createSubmission.mockResolvedValue({ id: 's2', createdAt: new Date('2026-03-03T00:00:00Z') });
    sendShavonLloydContactEmail.mockRejectedValue(new Error('plunk failed'));
    const { POST } = await import('./route');

    const req = new Request('http://localhost/api/features/shavon-lloyd-contact', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-real-ip': '10.0.0.55',
      },
      body: JSON.stringify({
        name: 'Jane',
        email: 'jane@example.com',
        message: 'This message is long enough',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(createSubmission).toHaveBeenCalledTimes(1);
    expect(sendShavonLloydContactEmail).toHaveBeenCalledTimes(1);
  });

  it('still returns 200 when persistence fails but email sends', async () => {
    createSubmission.mockRejectedValue(new Error('db unavailable'));
    const { POST } = await import('./route');

    const req = new Request('http://localhost/api/features/shavon-lloyd-contact', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-real-ip': '10.0.0.56',
      },
      body: JSON.stringify({
        name: 'Jane',
        email: 'jane@example.com',
        message: 'This message is long enough',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(createSubmission).toHaveBeenCalledTimes(1);
    expect(sendShavonLloydContactEmail).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when both persistence and email fail', async () => {
    createSubmission.mockRejectedValue(new Error('db unavailable'));
    sendShavonLloydContactEmail.mockRejectedValue(new Error('plunk failed'));
    const { POST } = await import('./route');

    const req = new Request('http://localhost/api/features/shavon-lloyd-contact', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-real-ip': '10.0.0.57',
      },
      body: JSON.stringify({
        name: 'Jane',
        email: 'jane@example.com',
        message: 'This message is long enough',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(createSubmission).toHaveBeenCalledTimes(1);
    expect(sendShavonLloydContactEmail).toHaveBeenCalledTimes(1);
  });

  it('returns 401 for GET without token', async () => {
    const { GET } = await import('./route');

    const req = new Request('http://localhost/api/features/shavon-lloyd-contact');
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(findManySubmissions).not.toHaveBeenCalled();
  });

  it('returns 200 for GET with token', async () => {
    findManySubmissions.mockResolvedValue([{ id: 's1', email: 'jane@example.com' }]);
    const { GET } = await import('./route');

    const req = new Request('http://localhost/api/features/shavon-lloyd-contact', {
      headers: { 'x-admin-token': 'secret' },
    });
    const res = await GET(req);
    const body = (await res.json()) as {
      ok: boolean;
      data: Array<{ id: string; email: string }>;
    };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data[0]?.id).toBe('s1');
    expect(findManySubmissions).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
    });
  });
});

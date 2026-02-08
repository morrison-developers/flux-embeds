import { beforeEach, describe, expect, it, vi } from 'vitest';

const resetQuarterWinners = vi.fn();

vi.mock('@/src/server/boards/repository', () => ({
  resetQuarterWinners,
}));

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://example';
  process.env.SUPERBOWL_ADMIN_TOKEN = 'secret';
  resetQuarterWinners.mockReset();
  resetQuarterWinners.mockResolvedValue(undefined);
});

describe('boards reset route', () => {
  it('rejects missing/invalid admin token', async () => {
    const { POST } = await import('./route');

    const req = new Request('http://localhost/api/boards/default/reset', {
      method: 'POST',
    });

    const res = await POST(req, { params: { boardId: 'default' } });
    expect(res.status).toBe(401);
  });

  it('resets winners when token is valid', async () => {
    const { POST } = await import('./route');

    const req = new Request('http://localhost/api/boards/default/reset', {
      method: 'POST',
      headers: { 'x-admin-token': 'secret' },
    });

    const res = await POST(req, { params: { boardId: 'default' } });
    expect(res.status).toBe(200);
    expect(resetQuarterWinners).toHaveBeenCalledWith('default');
  });
});

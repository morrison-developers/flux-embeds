import { beforeEach, describe, expect, it, vi } from 'vitest';

const getLiveBoardSnapshot = vi.fn();

vi.mock('@/src/server/boards/live', () => ({
  getLiveBoardSnapshot,
}));

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://example';
  process.env.SUPERBOWL_ADMIN_TOKEN = 'secret';
  getLiveBoardSnapshot.mockReset();
});

describe('boards live route', () => {
  it('returns deterministic fallback data shape', async () => {
    getLiveBoardSnapshot.mockResolvedValue({
      board: { id: 'default' },
      game: { id: 'g1' },
      winningCell: null,
      winningOwner: null,
      quarterWinners: [],
      liveStatus: 'fallback',
    });

    const { GET } = await import('./route');

    const req = new Request('http://localhost/api/boards/default/live');
    const res = await GET(req, { params: { boardId: 'default' } });
    const body = (await res.json()) as { ok: boolean; data: { liveStatus: string } };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.liveStatus).toBe('fallback');
  });

  it('returns 400 on invalid board id', async () => {
    const { GET } = await import('./route');
    const req = new Request('http://localhost/api/boards/@@@/live');
    const res = await GET(req, { params: { boardId: '@@@' } });

    expect(res.status).toBe(400);
  });
});

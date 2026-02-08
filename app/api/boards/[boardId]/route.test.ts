import { beforeEach, describe, expect, it, vi } from 'vitest';

const getOrCreateBoard = vi.fn();
const patchBoard = vi.fn();

vi.mock('@/src/server/boards/repository', () => ({
  getOrCreateBoard,
  patchBoard,
}));

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://example';
  process.env.SUPERBOWL_ADMIN_TOKEN = 'secret';
  getOrCreateBoard.mockReset();
  patchBoard.mockReset();
  getOrCreateBoard.mockResolvedValue({ id: 'default' });
  patchBoard.mockResolvedValue({ id: 'default' });
});

describe('boards route', () => {
  it('rejects PATCH when admin token missing', async () => {
    const { PATCH } = await import('./route');

    const req = new Request('http://localhost/api/boards/default', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });

    const res = await PATCH(req, { params: { boardId: 'default' } });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid board id', async () => {
    const { GET } = await import('./route');
    const req = new Request('http://localhost/api/boards/!!');
    const res = await GET(req, { params: { boardId: '!!' } });
    expect(res.status).toBe(400);
  });

  it('accepts PATCH with valid token', async () => {
    const { PATCH } = await import('./route');

    const req = new Request('http://localhost/api/boards/default', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-admin-token': 'secret',
      },
      body: JSON.stringify({ name: 'Updated' }),
    });

    const res = await PATCH(req, { params: { boardId: 'default' } });
    expect(res.status).toBe(200);
    expect(patchBoard).toHaveBeenCalled();
  });
});

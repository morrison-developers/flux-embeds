import { beforeEach, describe, expect, it, vi } from 'vitest';

const getBoardWithQuarterWinners = vi.fn();
const upsertQuarterWinner = vi.fn();
const getGameSnapshot = vi.fn();

vi.mock('@/src/server/boards/repository', () => ({
  getBoardWithQuarterWinners,
  upsertQuarterWinner,
}));

vi.mock('@/src/server/espn/client', () => ({
  getGameSnapshot,
}));

describe('getLiveBoardSnapshot', () => {
  beforeEach(() => {
    vi.resetModules();
    getBoardWithQuarterWinners.mockReset();
    upsertQuarterWinner.mockReset();
    getGameSnapshot.mockReset();

    getBoardWithQuarterWinners.mockResolvedValue({
      board: {
        id: 'b1',
        name: 'Board b1',
        defaultGameId: null,
        topTeamLabel: 'Away',
        sideTeamLabel: 'Home',
        columnMarkers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        rowMarkers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        assignments: Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => '')),
        themeDefaults: { theme: 'light', accent: '#111111', bg: '#ffffff', text: '#000000' },
        owners: [],
      },
      quarterWinners: [],
    });
  });

  it('finalizes quarter only once across repeated polling', async () => {
    getGameSnapshot
      .mockResolvedValueOnce({
        snapshot: {
          gameId: 'g1',
          homeTeam: 'Home',
          awayTeam: 'Away',
          homeScore: 7,
          awayScore: 0,
          period: 1,
          clock: '00:10',
          status: 'live',
          kickoffAt: null,
          lastUpdatedAt: new Date().toISOString(),
        },
        liveStatus: 'ok',
      })
      .mockResolvedValueOnce({
        snapshot: {
          gameId: 'g1',
          homeTeam: 'Home',
          awayTeam: 'Away',
          homeScore: 7,
          awayScore: 3,
          period: 2,
          clock: '15:00',
          status: 'live',
          kickoffAt: null,
          lastUpdatedAt: new Date().toISOString(),
        },
        liveStatus: 'ok',
      })
      .mockResolvedValueOnce({
        snapshot: {
          gameId: 'g1',
          homeTeam: 'Home',
          awayTeam: 'Away',
          homeScore: 7,
          awayScore: 3,
          period: 2,
          clock: '10:00',
          status: 'live',
          kickoffAt: null,
          lastUpdatedAt: new Date().toISOString(),
        },
        liveStatus: 'ok',
      });

    const { getLiveBoardSnapshot } = await import('@/src/server/boards/live');

    await getLiveBoardSnapshot({ boardId: 'b1' });
    await getLiveBoardSnapshot({ boardId: 'b1' });
    await getLiveBoardSnapshot({ boardId: 'b1' });

    expect(upsertQuarterWinner).toHaveBeenCalledTimes(1);
    expect(upsertQuarterWinner).toHaveBeenCalledWith(
      expect.objectContaining({
        boardId: 'b1',
        quarter: 1,
      })
    );
  });
});

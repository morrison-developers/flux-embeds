import {
  computeWinningCell,
  computeWinningOwner,
  detectQuarterTransition,
  mapScoreDigitToGridIndex,
} from '@/src/domain/superbowl';
import type { BoardConfig, GameSnapshot } from '@/src/types/superbowl';

describe('mapScoreDigitToGridIndex', () => {
  it('maps all digits when markers are ordered', () => {
    const markers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let digit = 0; digit <= 9; digit += 1) {
      expect(mapScoreDigitToGridIndex(digit, markers)).toBe(digit);
    }
  });

  it('maps digits for shuffled marker permutations', () => {
    const markers = [7, 0, 9, 2, 4, 8, 1, 5, 3, 6];
    expect(mapScoreDigitToGridIndex(7, markers)).toBe(0);
    expect(mapScoreDigitToGridIndex(6, markers)).toBe(9);
  });
});

describe('computeWinningCell', () => {
  const board: Pick<BoardConfig, 'rowMarkers' | 'columnMarkers'> = {
    rowMarkers: [3, 1, 5, 0, 2, 8, 4, 7, 9, 6],
    columnMarkers: [6, 9, 1, 4, 7, 0, 8, 3, 2, 5],
  };

  it('computes cell from score last digits', () => {
    const result = computeWinningCell(27, 13, board);
    expect(result).toEqual({
      row: 7,
      col: 7,
      rowMarker: 7,
      colMarker: 3,
    });
  });
});

describe('computeWinningOwner', () => {
  it('returns owner based on assignment matrix initials', () => {
    const assignments = Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => ''));
    assignments[2][5] = 'AM';

    const owners = [
      {
        id: 'owner-1',
        boardId: 'default',
        initials: 'AM',
        displayName: 'Andrew',
        bgColor: '#000000',
        textColor: '#ffffff',
        sortOrder: 0,
      },
    ];

    const winner = computeWinningOwner(assignments, { row: 2, col: 5, rowMarker: 2, colMarker: 5 }, owners);
    expect(winner?.id).toBe('owner-1');
  });
});

describe('detectQuarterTransition', () => {
  const makeSnapshot = (period: number): GameSnapshot => ({
    gameId: 'game',
    homeTeam: 'Home',
    awayTeam: 'Away',
    homeScore: 1,
    awayScore: 2,
    period,
    clock: '00:00',
    status: 'live',
    lastUpdatedAt: new Date().toISOString(),
  });

  it('detects normal quarter transitions including OT', () => {
    expect(detectQuarterTransition(makeSnapshot(1), makeSnapshot(2))).toEqual({
      finalizedQuarter: 1,
    });
    expect(detectQuarterTransition(makeSnapshot(4), makeSnapshot(5))).toEqual({
      finalizedQuarter: 4,
    });
  });

  it('does not finalize when period does not increase', () => {
    expect(detectQuarterTransition(makeSnapshot(2), makeSnapshot(2))).toEqual({});
  });
});

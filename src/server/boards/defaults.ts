import type { BoardAssignmentMatrix, ThemeDefaults } from '@/src/types/superbowl';

const DEFAULT_MARKERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const DEFAULT_THEME: ThemeDefaults = {
  theme: 'light',
  accent: '#161d21',
  bg: '#ffffff',
  text: '#111111',
};

function shuffleDigits(input: number[]): number[] {
  const next = [...input];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function emptyAssignmentMatrix(): BoardAssignmentMatrix {
  return Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => ''));
}

export function buildDefaultBoard(boardId: string) {
  return {
    id: boardId,
    name: `Board ${boardId}`,
    defaultGameId: process.env.SUPERBOWL_DEFAULT_GAME_ID ?? null,
    topTeamLabel: 'Away',
    sideTeamLabel: 'Home',
    columnMarkers: shuffleDigits(DEFAULT_MARKERS),
    rowMarkers: shuffleDigits(DEFAULT_MARKERS),
    assignments: emptyAssignmentMatrix(),
    themeDefaults: DEFAULT_THEME,
    owners: [],
  };
}

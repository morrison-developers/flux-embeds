export type BoardAssignmentMatrix = string[][];

export type ThemeDefaults = {
  theme: 'light' | 'dark' | 'auto';
  accent: string;
  bg: string;
  text: string;
};

export type BoardOwner = {
  id: string;
  boardId: string;
  initials: string;
  displayName: string;
  bgColor: string;
  textColor: string;
  sortOrder: number;
  lockedAt?: string | null;
};

export type BoardConfig = {
  id: string;
  name: string;
  defaultGameId: string | null;
  topTeamLabel: string;
  sideTeamLabel: string;
  columnMarkers: number[];
  rowMarkers: number[];
  assignments: BoardAssignmentMatrix;
  themeDefaults: ThemeDefaults;
  owners: BoardOwner[];
};

export type GameStatus = 'pre' | 'live' | 'final' | 'fallback';

export type GameSnapshot = {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period: number;
  clock: string;
  status: GameStatus;
  kickoffAt: string | null;
  lastUpdatedAt: string;
};

export type WinningCell = {
  row: number;
  col: number;
  rowMarker: number;
  colMarker: number;
};

export type QuarterWinner = {
  id: string;
  boardId: string;
  quarter: number;
  ownerId: string | null;
  ownerInitials: string | null;
  ownerDisplayName: string | null;
  homeScore: number;
  awayScore: number;
  gamePeriodRecorded: number;
};

export type LiveBoardSnapshot = {
  board: BoardConfig;
  game: GameSnapshot;
  winningCell: WinningCell | null;
  winningOwner: BoardOwner | null;
  quarterWinners: QuarterWinner[];
  liveStatus: 'ok' | 'fallback';
};

export type LiveBoardApiResponse = {
  ok: true;
  data: LiveBoardSnapshot;
};

export type ApiErrorResponse = {
  ok: false;
  error: string;
  code?: string;
};

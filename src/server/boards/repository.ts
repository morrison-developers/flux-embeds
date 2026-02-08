import type { Prisma } from '@prisma/client';
import { prisma } from '@/src/server/prisma';
import { buildDefaultBoard } from '@/src/server/boards/defaults';
import type { BoardConfig, BoardOwner, QuarterWinner } from '@/src/types/superbowl';

type BoardWithRelations = Prisma.BoardGetPayload<{
  include: {
    owners: true;
    quarterWinners: {
      include: {
        owner: true;
      };
      orderBy: {
        quarter: 'asc';
      };
    };
  };
}>;

const SUPER_ADMIN_NAME = 'admin adminson';

function normalizeNameKey(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function isSuperAdminOwnerName(name: string) {
  return normalizeNameKey(name) === SUPER_ADMIN_NAME;
}

function toNumberArray(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) return fallback;
  if (value.length !== 10) return fallback;
  const parsed = value.map((n) => (typeof n === 'number' ? n : NaN));
  if (parsed.some((n) => Number.isNaN(n))) return fallback;
  return parsed;
}

function toMatrix(value: unknown): string[][] {
  if (!Array.isArray(value) || value.length !== 10) {
    return Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => ''));
  }

  return value.map((row) => {
    if (!Array.isArray(row) || row.length !== 10) {
      return Array.from({ length: 10 }, () => '');
    }
    return row.map((cell) => (typeof cell === 'string' ? cell : ''));
  });
}

function toOwner(record: BoardWithRelations['owners'][number]): BoardOwner {
  return {
    id: record.id,
    boardId: record.boardId,
    initials: record.initials,
    displayName: record.displayName,
    bgColor: record.bgColor,
    textColor: record.textColor,
    sortOrder: record.sortOrder,
    lockedAt: record.lockedAt?.toISOString() ?? null,
  };
}

function toBoardConfig(record: BoardWithRelations): BoardConfig {
  const defaults = buildDefaultBoard(record.id);

  const themeDefaults =
    typeof record.themeDefaults === 'object' && record.themeDefaults !== null
      ? (record.themeDefaults as BoardConfig['themeDefaults'])
      : defaults.themeDefaults;

  return {
    id: record.id,
    name: record.name,
    defaultGameId: record.defaultGameId,
    topTeamLabel: record.topTeamLabel,
    sideTeamLabel: record.sideTeamLabel,
    columnMarkers: toNumberArray(record.columnMarkers, defaults.columnMarkers),
    rowMarkers: toNumberArray(record.rowMarkers, defaults.rowMarkers),
    assignments: toMatrix(record.assignments),
    themeDefaults,
    owners: record.owners
      .filter((owner) => !isSuperAdminOwnerName(owner.displayName))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(toOwner),
  };
}

function toQuarterWinner(record: BoardWithRelations['quarterWinners'][number]): QuarterWinner {
  return {
    id: record.id,
    boardId: record.boardId,
    quarter: record.quarter,
    ownerId: record.ownerId,
    ownerInitials: record.owner?.initials ?? null,
    ownerDisplayName: record.owner?.displayName ?? null,
    homeScore: record.homeScore,
    awayScore: record.awayScore,
    gamePeriodRecorded: record.gamePeriodRecorded,
  };
}

export async function getOrCreateBoard(boardId: string): Promise<BoardConfig> {
  const defaults = buildDefaultBoard(boardId);

  await prisma.board.upsert({
    where: { id: boardId },
    update: {},
    create: {
      id: defaults.id,
      name: defaults.name,
      defaultGameId: defaults.defaultGameId,
      topTeamLabel: defaults.topTeamLabel,
      sideTeamLabel: defaults.sideTeamLabel,
      columnMarkers: defaults.columnMarkers,
      rowMarkers: defaults.rowMarkers,
      assignments: defaults.assignments,
      themeDefaults: defaults.themeDefaults,
    },
  });

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { owners: true, quarterWinners: { include: { owner: true }, orderBy: { quarter: 'asc' } } },
  });

  if (!board) {
    throw new Error(`Board ${boardId} not found after creation.`);
  }

  return toBoardConfig(board as BoardWithRelations);
}

export async function getBoardWithQuarterWinners(boardId: string): Promise<{
  board: BoardConfig;
  quarterWinners: QuarterWinner[];
}> {
  const defaults = buildDefaultBoard(boardId);

  await prisma.board.upsert({
    where: { id: boardId },
    update: {},
    create: {
      id: defaults.id,
      name: defaults.name,
      defaultGameId: defaults.defaultGameId,
      topTeamLabel: defaults.topTeamLabel,
      sideTeamLabel: defaults.sideTeamLabel,
      columnMarkers: defaults.columnMarkers,
      rowMarkers: defaults.rowMarkers,
      assignments: defaults.assignments,
      themeDefaults: defaults.themeDefaults,
    },
  });

  const record = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      owners: true,
      quarterWinners: {
        include: { owner: true },
        orderBy: { quarter: 'asc' },
      },
    },
  });

  if (!record) {
    throw new Error(`Board ${boardId} not found after upsert.`);
  }

  return {
    board: toBoardConfig(record as BoardWithRelations),
    quarterWinners: (record as BoardWithRelations).quarterWinners.map(toQuarterWinner),
  };
}

type PatchInput = Partial<
  Omit<BoardConfig, 'id' | 'owners'> & {
    owners: Omit<BoardOwner, 'id' | 'boardId'>[];
  }
>;

export async function patchBoard(boardId: string, input: PatchInput): Promise<BoardConfig> {
  await getOrCreateBoard(boardId);

  await prisma.$transaction(async (tx) => {
    const boardUpdate: Prisma.BoardUpdateInput = {};

    if (input.name !== undefined) boardUpdate.name = input.name;
    if (input.defaultGameId !== undefined) boardUpdate.defaultGameId = input.defaultGameId;
    if (input.topTeamLabel !== undefined) boardUpdate.topTeamLabel = input.topTeamLabel;
    if (input.sideTeamLabel !== undefined) boardUpdate.sideTeamLabel = input.sideTeamLabel;
    if (input.columnMarkers !== undefined) boardUpdate.columnMarkers = input.columnMarkers;
    if (input.rowMarkers !== undefined) boardUpdate.rowMarkers = input.rowMarkers;
    if (input.assignments !== undefined) boardUpdate.assignments = input.assignments;
    if (input.themeDefaults !== undefined) boardUpdate.themeDefaults = input.themeDefaults;

    if (Object.keys(boardUpdate).length > 0) {
      await tx.board.update({ where: { id: boardId }, data: boardUpdate });
    }

    if (input.owners) {
      await tx.boardOwner.deleteMany({ where: { boardId } });
      if (input.owners.length > 0) {
        await tx.boardOwner.createMany({
          data: input.owners.map((owner) => ({
            boardId,
            initials: owner.initials,
            displayName: owner.displayName,
            bgColor: owner.bgColor,
            textColor: owner.textColor,
            sortOrder: owner.sortOrder,
          })),
        });
      }
    }
  });

  return getOrCreateBoard(boardId);
}

export async function upsertQuarterWinner(params: {
  boardId: string;
  quarter: number;
  ownerId: string | null;
  homeScore: number;
  awayScore: number;
  gamePeriodRecorded: number;
}) {
  return prisma.quarterWinner.upsert({
    where: {
      boardId_quarter: {
        boardId: params.boardId,
        quarter: params.quarter,
      },
    },
    update: {
      ownerId: params.ownerId,
      homeScore: params.homeScore,
      awayScore: params.awayScore,
      gamePeriodRecorded: params.gamePeriodRecorded,
    },
    create: {
      boardId: params.boardId,
      quarter: params.quarter,
      ownerId: params.ownerId,
      homeScore: params.homeScore,
      awayScore: params.awayScore,
      gamePeriodRecorded: params.gamePeriodRecorded,
    },
  });
}

export async function resetQuarterWinners(boardId: string) {
  await getOrCreateBoard(boardId);
  await prisma.quarterWinner.deleteMany({ where: { boardId } });
}

function normalizeOwnerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function nameToInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return 'GU';
  const initials = parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
  return initials.slice(0, 4) || 'GU';
}

function safeInitials(initials?: string, fallbackName?: string): string {
  const clean = (initials ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
  if (clean) return clean;
  return nameToInitials(fallbackName ?? '');
}

function emptyAssignmentMatrix() {
  return Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => ''));
}

const DEMO_OWNERS: Array<{
  initials: string;
  displayName: string;
  bgColor: string;
  textColor: string;
}> = [
  { initials: 'AB', displayName: 'Alex Brown', bgColor: '#1d4ed8', textColor: '#ffffff' },
  { initials: 'NB', displayName: 'Nicoletta Berry', bgColor: '#0f766e', textColor: '#ffffff' },
  { initials: 'RJ', displayName: 'Ryan James', bgColor: '#9333ea', textColor: '#ffffff' },
  { initials: 'KT', displayName: 'Kim Taylor', bgColor: '#ea580c', textColor: '#ffffff' },
  { initials: 'MO', displayName: 'Mia Owens', bgColor: '#be123c', textColor: '#ffffff' },
  { initials: 'LS', displayName: 'Leo Santos', bgColor: '#334155', textColor: '#ffffff' },
];

const MAX_PICKS_PER_OWNER = 16;

export async function claimGuestOwner(params: {
  boardId: string;
  guestName: string;
  initials?: string;
  bgColor?: string;
  textColor?: string;
}) {
  const board = await getOrCreateBoard(params.boardId);
  const guestName = normalizeOwnerName(params.guestName);
  if (isSuperAdminOwnerName(guestName)) {
    throw new Error('ADMIN_OWNER_FORBIDDEN');
  }
  const requestedInitials = safeInitials(params.initials, guestName);

  const existingByName = board.owners.find(
    (owner) => owner.displayName.trim().toLowerCase() === guestName.toLowerCase()
  );
  if (existingByName) {
    return existingByName;
  }

  if (board.owners.length >= 6) {
    throw new Error('BOARD_OWNER_LIMIT_REACHED');
  }

  const initialsTaken = board.owners.some((owner) => owner.initials === requestedInitials);
  if (initialsTaken) {
    throw new Error('OWNER_INITIALS_TAKEN');
  }

  const sortOrder = board.owners.length;
  const owner = await prisma.boardOwner.create({
    data: {
      boardId: params.boardId,
      initials: requestedInitials,
      displayName: guestName,
      bgColor: params.bgColor ?? '#1d4ed8',
      textColor: params.textColor ?? '#ffffff',
      sortOrder,
      lockedAt: null,
    },
  });

  return {
    id: owner.id,
    boardId: owner.boardId,
    initials: owner.initials,
    displayName: owner.displayName,
    bgColor: owner.bgColor,
    textColor: owner.textColor,
    sortOrder: owner.sortOrder,
    lockedAt: owner.lockedAt?.toISOString() ?? null,
  };
}

export async function setGuestPick(params: {
  boardId: string;
  guestName: string;
  row: number;
  col: number;
  selected: boolean;
}) {
  await getOrCreateBoard(params.boardId);

  const guestName = normalizeOwnerName(params.guestName);
  const owner = await prisma.boardOwner.findFirst({
    where: {
      boardId: params.boardId,
      displayName: {
        equals: guestName,
        mode: 'insensitive',
      },
    },
  });

  if (!owner) {
    throw new Error('OWNER_NOT_FOUND');
  }
  if (owner.lockedAt) {
    throw new Error('PICKS_LOCKED');
  }

  if (params.row < 0 || params.row > 9 || params.col < 0 || params.col > 9) {
    throw new Error('INVALID_CELL');
  }

  await prisma.$transaction(async (tx) => {
    const board = await tx.board.findUnique({
      where: { id: params.boardId },
      select: { assignments: true },
    });
    if (!board) throw new Error('BOARD_NOT_FOUND');

    const matrix = toMatrix(board.assignments);
    const current = matrix[params.row][params.col]?.trim() ?? '';

    if (params.selected) {
      if (current && current !== owner.initials) {
        throw new Error('CELL_TAKEN');
      }
      if (current !== owner.initials) {
        const currentPickCount = matrix.reduce((total, row) => {
          return total + row.filter((cell) => cell.trim() === owner.initials).length;
        }, 0);
        if (currentPickCount >= MAX_PICKS_PER_OWNER) {
          throw new Error('PICK_LIMIT_REACHED');
        }
      }
      matrix[params.row][params.col] = owner.initials;
    } else if (current === owner.initials) {
      matrix[params.row][params.col] = '';
    }

    await tx.board.update({
      where: { id: params.boardId },
      data: { assignments: matrix },
    });
  });
}

export async function lockGuestPicks(params: { boardId: string; guestName: string }) {
  await getOrCreateBoard(params.boardId);

  const guestName = normalizeOwnerName(params.guestName);
  const owner = await prisma.boardOwner.findFirst({
    where: {
      boardId: params.boardId,
      displayName: {
        equals: guestName,
        mode: 'insensitive',
      },
    },
  });

  if (!owner) {
    throw new Error('OWNER_NOT_FOUND');
  }

  if (owner.lockedAt) {
    return {
      id: owner.id,
      boardId: owner.boardId,
      initials: owner.initials,
      displayName: owner.displayName,
      bgColor: owner.bgColor,
      textColor: owner.textColor,
      sortOrder: owner.sortOrder,
      lockedAt: owner.lockedAt.toISOString(),
    };
  }

  const board = await prisma.board.findUnique({
    where: { id: params.boardId },
    select: { assignments: true },
  });
  if (!board) {
    throw new Error('BOARD_NOT_FOUND');
  }
  const matrix = toMatrix(board.assignments);
  const currentPickCount = matrix.reduce((total, row) => {
    return total + row.filter((cell) => cell.trim() === owner.initials).length;
  }, 0);
  if (currentPickCount < MAX_PICKS_PER_OWNER) {
    throw new Error('PICKS_INCOMPLETE');
  }

  const updated = await prisma.boardOwner.update({
    where: { id: owner.id },
    data: { lockedAt: new Date() },
  });

  return {
    id: updated.id,
    boardId: updated.boardId,
    initials: updated.initials,
    displayName: updated.displayName,
    bgColor: updated.bgColor,
    textColor: updated.textColor,
    sortOrder: updated.sortOrder,
    lockedAt: updated.lockedAt?.toISOString() ?? null,
  };
}

function seedDemoAssignments(initials: string[]) {
  const matrix = emptyAssignmentMatrix();
  const slotsPerOwner = MAX_PICKS_PER_OWNER;
  const totalSlots = Math.min(100, initials.length * slotsPerOwner);

  // Use a coprime step over 100 cells for deterministic spread across the grid.
  for (let i = 0; i < totalSlots; i += 1) {
    const ownerIndex = Math.floor(i / slotsPerOwner);
    const cellIndex = (i * 37) % 100;
    const row = Math.floor(cellIndex / 10);
    const col = cellIndex % 10;
    matrix[row][col] = initials[ownerIndex] ?? '';
  }

  return matrix;
}

function shuffledMarkers() {
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = digits.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits;
}

export async function runGuestAdminAction(params: {
  boardId: string;
  action: 'clear_picks' | 'clear_winners' | 'clear_all' | 'seed_demo';
}) {
  await getOrCreateBoard(params.boardId);

  switch (params.action) {
    case 'clear_picks': {
      await prisma.board.update({
        where: { id: params.boardId },
        data: { assignments: emptyAssignmentMatrix() },
      });
      return { action: params.action, ok: true };
    }
    case 'clear_winners': {
      await prisma.quarterWinner.deleteMany({ where: { boardId: params.boardId } });
      return { action: params.action, ok: true };
    }
    case 'clear_all': {
      await prisma.$transaction(async (tx) => {
        await tx.quarterWinner.deleteMany({ where: { boardId: params.boardId } });
        await tx.boardOwner.deleteMany({ where: { boardId: params.boardId } });
        await tx.board.update({
          where: { id: params.boardId },
          data: {
            assignments: emptyAssignmentMatrix(),
            rowMarkers: shuffledMarkers(),
            columnMarkers: shuffledMarkers(),
          },
        });
      });
      return { action: params.action, ok: true };
    }
    case 'seed_demo': {
      await prisma.$transaction(async (tx) => {
        await tx.boardOwner.deleteMany({ where: { boardId: params.boardId } });
        await tx.quarterWinner.deleteMany({ where: { boardId: params.boardId } });
        const now = new Date();
        await tx.boardOwner.createMany({
          data: DEMO_OWNERS.map((owner, index) => ({
            boardId: params.boardId,
            initials: owner.initials,
            displayName: owner.displayName,
            bgColor: owner.bgColor,
            textColor: owner.textColor,
            sortOrder: index,
            lockedAt: now,
          })),
        });
        await tx.board.update({
          where: { id: params.boardId },
          data: {
            assignments: seedDemoAssignments(DEMO_OWNERS.map((owner) => owner.initials)),
            rowMarkers: shuffledMarkers(),
            columnMarkers: shuffledMarkers(),
          },
        });
      });
      return { action: params.action, ok: true };
    }
  }
}

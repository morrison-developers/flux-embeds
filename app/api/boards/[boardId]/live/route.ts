import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { apiError } from '@/src/server/api/errors';
import { resolveRouteParams } from '@/src/server/api/params';
import { isRateLimited } from '@/src/server/api/rateLimit';
import { boardIdSchema, liveQuerySchema } from '@/src/server/api/validation';
import { computeWinningCell, computeWinningOwner } from '@/src/domain/superbowl';
import { getBoardWithQuarterWinners } from '@/src/server/boards/repository';
import { getLiveBoardSnapshot } from '@/src/server/boards/live';
import {
  isEnvConfigError,
  validateDatabaseEnv,
  warnMissingOptionalEnv,
} from '@/src/server/env';

const LIVE_RATE_LIMIT_MS = 750;
const liveSnapshotCache = new Map<string, { data: unknown; cachedAt: number }>();

async function getTestLiveSnapshot(boardId: string) {
  const { board, quarterWinners } = await getBoardWithQuarterWinners(boardId);
  const now = Date.now();
  const awayScore = Math.floor((now / 1000) % 37);
  const homeScore = Math.floor((now / 1200) % 35);
  const period = Math.max(1, Math.min(4, Math.floor((now / 90_000) % 4) + 1));

  const winningCell = computeWinningCell(homeScore, awayScore, board);
  const winningOwner = computeWinningOwner(board.assignments, winningCell, board.owners);

  return {
    board,
    game: {
      gameId: 'test-mode',
      homeTeam: 'Home Testers',
      awayTeam: 'Away Testers',
      homeScore,
      awayScore,
      period,
      clock: 'TEST',
      status: 'live' as const,
      kickoffAt: new Date(now + 30 * 60_000).toISOString(),
      lastUpdatedAt: new Date(now).toISOString(),
    },
    winningCell,
    winningOwner,
    quarterWinners,
    liveStatus: 'ok' as const,
  };
}

export async function GET(
  req: Request,
  context: { params: Promise<{ boardId: string }> | { boardId: string } }
) {
  try {
    validateDatabaseEnv();
    warnMissingOptionalEnv();

    const params = await resolveRouteParams(context.params);
    const boardId = boardIdSchema.parse(params.boardId);

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const key = `${boardId}:${ip}`;
    if (isRateLimited(key, LIVE_RATE_LIMIT_MS)) {
      const cached = liveSnapshotCache.get(boardId);
      if (cached) {
        return NextResponse.json(
          {
            ok: true,
            data: cached.data,
            meta: {
              stale: true,
              rateLimited: true,
              cachedAt: new Date(cached.cachedAt).toISOString(),
            },
          },
          { status: 200 }
        );
      }

      return apiError(429, 'Too many requests.', 'RATE_LIMITED');
    }

    const url = new URL(req.url);
    const query = liveQuerySchema.parse({
      gameId: url.searchParams.get('gameId') ?? undefined,
      testMode: url.searchParams.get('testMode') ?? undefined,
    });

    if (query.testMode === '1') {
      const guestName = (req.headers.get('x-superbowl-guest-name') ?? '').trim().toLowerCase();
      if (guestName !== 'admin adminson') {
        return apiError(403, 'Test mode is restricted.', 'FORBIDDEN');
      }
    }

    const data =
      query.testMode === '1'
        ? await getTestLiveSnapshot(boardId)
        : await getLiveBoardSnapshot({
            boardId,
            gameId: query.gameId,
          });

    liveSnapshotCache.set(boardId, { data, cachedAt: Date.now() });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, 'Invalid request query.', 'BAD_REQUEST');
    }
    if (isEnvConfigError(error)) {
      return apiError(500, error.message, error.code);
    }

    return apiError(500, 'Failed to load live board snapshot.', 'INTERNAL');
  }
}

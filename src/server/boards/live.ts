import {
  computeWinningCell,
  computeWinningOwner,
  detectQuarterTransition,
} from '@/src/domain/superbowl';
import {
  getBoardWithQuarterWinners,
  upsertQuarterWinner,
} from '@/src/server/boards/repository';
import { getGameSnapshot } from '@/src/server/espn/client';
import type { GameSnapshot, LiveBoardSnapshot } from '@/src/types/superbowl';

const lastSnapshotByBoard = new Map<string, GameSnapshot>();

export async function getLiveBoardSnapshot(params: {
  boardId: string;
  gameId?: string;
}): Promise<LiveBoardSnapshot> {
  const { boardId, gameId } = params;

  const current = await getBoardWithQuarterWinners(boardId);
  const gameResult = await getGameSnapshot({
    gameId,
    boardDefaultGameId: current.board.defaultGameId,
  });

  const winningCell = computeWinningCell(
    gameResult.snapshot.homeScore,
    gameResult.snapshot.awayScore,
    current.board
  );
  const winningOwner = computeWinningOwner(
    current.board.assignments,
    winningCell,
    current.board.owners
  );

  const previous = lastSnapshotByBoard.get(boardId) ?? null;
  const transition = detectQuarterTransition(previous, gameResult.snapshot);

  if (transition.finalizedQuarter !== undefined) {
    const finalizedCell = computeWinningCell(
      previous?.homeScore ?? gameResult.snapshot.homeScore,
      previous?.awayScore ?? gameResult.snapshot.awayScore,
      current.board
    );
    const finalizedOwner = computeWinningOwner(
      current.board.assignments,
      finalizedCell,
      current.board.owners
    );

    try {
      await upsertQuarterWinner({
        boardId,
        quarter: transition.finalizedQuarter,
        ownerId: finalizedOwner?.id ?? null,
        homeScore: previous?.homeScore ?? gameResult.snapshot.homeScore,
        awayScore: previous?.awayScore ?? gameResult.snapshot.awayScore,
        gamePeriodRecorded: transition.finalizedQuarter,
      });
    } catch (error) {
      console.error('[superb-owl] quarter finalization failed', {
        boardId,
        quarter: transition.finalizedQuarter,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  lastSnapshotByBoard.set(boardId, gameResult.snapshot);

  const refreshed = await getBoardWithQuarterWinners(boardId);

  return {
    board: refreshed.board,
    game: gameResult.snapshot,
    winningCell,
    winningOwner,
    quarterWinners: refreshed.quarterWinners,
    liveStatus: gameResult.liveStatus,
  };
}

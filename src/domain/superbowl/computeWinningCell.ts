import { mapScoreDigitToGridIndex } from './mapScoreDigitToGridIndex';
import type { BoardConfig, WinningCell } from '@/src/types/superbowl';

function toLastDigit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.abs(Math.floor(value)) % 10;
}

export function computeWinningCell(
  homeScore: number,
  awayScore: number,
  board: Pick<BoardConfig, 'rowMarkers' | 'columnMarkers'>
): WinningCell | null {
  const rowMarker = toLastDigit(homeScore);
  const colMarker = toLastDigit(awayScore);

  const row = mapScoreDigitToGridIndex(rowMarker, board.rowMarkers);
  const col = mapScoreDigitToGridIndex(colMarker, board.columnMarkers);

  if (row < 0 || col < 0) {
    return null;
  }

  return { row, col, rowMarker, colMarker };
}

import type { BoardOwner, BoardAssignmentMatrix, WinningCell } from '@/src/types/superbowl';

export function computeWinningOwner(
  assignments: BoardAssignmentMatrix,
  cell: WinningCell | null,
  owners: BoardOwner[]
): BoardOwner | null {
  if (!cell) {
    return null;
  }

  const row = assignments[cell.row];
  if (!row) {
    return null;
  }

  const initials = row[cell.col]?.trim();
  if (!initials) {
    return null;
  }

  return owners.find((owner) => owner.initials === initials) ?? null;
}

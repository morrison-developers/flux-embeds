'use client';

import type { CSSProperties } from 'react';
import type { BoardConfig, WinningCell } from '@/src/types/superbowl';
import styles from '../superbowl.module.css';

export function Grid({
  board,
  winningCell,
  ownerInitials,
  onCellToggle,
  busyCellKeys,
  revealMarkers,
  revealWinner,
}: {
  board: BoardConfig;
  winningCell: WinningCell | null;
  ownerInitials?: string | null;
  onCellToggle?: (row: number, col: number, selected: boolean) => void;
  busyCellKeys?: Record<string, boolean>;
  revealMarkers: boolean;
  revealWinner: boolean;
}) {
  const guestOwner = ownerInitials
    ? board.owners.find((owner) => owner.initials === ownerInitials) ?? null
    : null;

  return (
    <div className={styles.gridWrap}>
      <table className={styles.gridTable}>
        <thead>
          <tr>
            <th className={`${styles.gridHeadCell} ${styles.gridAxisCell}`} title={board.topTeamLabel}>
              {board.topTeamLabel}
            </th>
            {board.columnMarkers.map((marker, colIndex) => (
              <th key={`col-${colIndex}-${marker}`} className={styles.gridHeadCell}>
                {revealMarkers ? marker : '?'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {board.rowMarkers.map((marker, rowIndex) => (
            <tr key={`row-${marker}-${rowIndex}`}>
              <th
                className={`${styles.gridHeadCell} ${styles.gridAxisCell}`}
                title={rowMarkerLabel(board.sideTeamLabel, revealMarkers ? marker : null)}
              >
                {revealMarkers ? marker : '?'}
              </th>
              {board.assignments[rowIndex].map((cell, colIndex) => {
                const isWinner =
                  revealWinner && winningCell?.row === rowIndex && winningCell?.col === colIndex;
                const isOwnedByGuest = ownerInitials ? cell === ownerInitials : false;
                const isTakenByOther = Boolean(cell) && !isOwnedByGuest;
                const cellKey = `${rowIndex}:${colIndex}`;
                const isBusy = Boolean(busyCellKeys?.[cellKey]);
                const canInteractCell = Boolean(onCellToggle) && !isBusy && !isTakenByOther;
                const className = isWinner
                  ? `${styles.gridCell} ${styles.gridWinner}`
                  : isOwnedByGuest
                    ? `${styles.gridCell} ${styles.gridOwned}`
                    : isTakenByOther
                      ? `${styles.gridCell} ${styles.gridTaken}`
                    : styles.gridCell;
                const nextSelected = !isOwnedByGuest;
                const guestCellStyle =
                  !isWinner && isOwnedByGuest && guestOwner
                    ? {
                        background: guestOwner.bgColor,
                        color: guestOwner.textColor,
                      }
                    : undefined;
                const hoverBg = guestOwner
                  ? hexToRgba(guestOwner.bgColor, 0.24)
                  : 'rgba(255, 255, 255, 0.08)';
                const buttonStyle = canInteractCell
                  ? ({ '--grid-hover-bg': hoverBg } as CSSProperties)
                  : undefined;

                return (
                  <td
                    key={`cell-${rowIndex}-${colIndex}`}
                    className={className}
                    style={guestCellStyle}
                  >
                    <button
                      type="button"
                      className={`${styles.gridCellButton} ${canInteractCell ? styles.gridCellButtonInteractive : ''}`}
                      style={buttonStyle}
                      disabled={!onCellToggle || isBusy}
                      onClick={() => onCellToggle?.(rowIndex, colIndex, nextSelected)}
                      title={
                        onCellToggle
                          ? isOwnedByGuest
                            ? 'Remove your pick'
                            : 'Pick this square'
                          : undefined
                      }
                    >
                      {isBusy ? '…' : cell || '-'}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function rowMarkerLabel(sideLabel: string, marker: number | null): string {
  return marker === null ? `${sideLabel} hidden` : `${sideLabel} ${marker}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const normalized =
    clean.length === 3
      ? clean
          .split('')
          .map((ch) => `${ch}${ch}`)
          .join('')
      : clean;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    return 'rgba(255, 255, 255, 0.08)';
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

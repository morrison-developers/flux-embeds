'use client';

import type { BoardOwner, QuarterWinner } from '@/src/types/superbowl';
import styles from '../superbowl.module.css';

export function Sidebar({
  quarterWinners,
  winningOwner,
  owners,
}: {
  quarterWinners: QuarterWinner[];
  winningOwner: BoardOwner | null;
  owners: BoardOwner[];
}) {
  return (
    <aside className={styles.sidebar}>
      <div className={`${styles.card} ${styles.sidebarCard}`}>
        <div className={styles.kicker}>Current winner</div>
        <div
          className={winningOwner ? styles.currentWinner : `${styles.currentWinner} ${styles.winnerUnknown}`}
          style={buildCurrentWinnerStyle(winningOwner)}
        >
          {winningOwner ? winningOwner.displayName : 'No winner yet'}
        </div>
      </div>

      <div className={`${styles.card} ${styles.sidebarCard}`}>
        <div className={styles.kicker}>Quarter winners</div>

        {quarterWinners.length === 0 ? (
          <div className={styles.quarterEmpty}>No finalized quarters yet.</div>
        ) : (
          <div className={styles.quarterList}>
            {quarterWinners.map((winner) => (
              <div
                key={winner.id}
                className={styles.quarterRow}
                style={buildQuarterRowStyle(winner, owners)}
              >
                <strong className={styles.quarterLabel}>
                  {winner.quarter >= 5 ? `OT${winner.quarter - 4}` : `Q${winner.quarter}`}
                </strong>
                <span className={styles.quarterValue}>
                  {winner.ownerDisplayName
                    ? `${winner.ownerDisplayName} (${winner.homeScore}-${winner.awayScore})`
                    : `N/A (${winner.homeScore}-${winner.awayScore})`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function buildCurrentWinnerStyle(winningOwner: BoardOwner | null) {
  if (!winningOwner) return undefined;

  return {
    borderTop: `1px solid ${withAlpha(winningOwner.bgColor, 0.55)}`,
    background: `linear-gradient(90deg, ${withAlpha(winningOwner.bgColor, 0.16)}, transparent 72%)`,
    borderRadius: '8px',
    padding: '8px',
  };
}

function buildQuarterRowStyle(winner: QuarterWinner, owners: BoardOwner[]) {
  const owner =
    owners.find((entry) => entry.id === winner.ownerId) ??
    owners.find(
      (entry) =>
        winner.ownerDisplayName &&
        entry.displayName.trim().toLowerCase() === winner.ownerDisplayName.trim().toLowerCase()
    );
  if (!owner) return undefined;

  const isPreview = winner.id.startsWith('preview-');
  const bgAlpha = isPreview ? 0.28 : 0.16;

  return {
    borderTopColor: withAlpha(owner.bgColor, 0.55),
    background: `linear-gradient(90deg, ${withAlpha(owner.bgColor, bgAlpha)}, transparent 72%)`,
    borderRadius: '8px',
    padding: '8px',
  };
}

function withAlpha(hex: string, alpha: number) {
  const clean = hex.replace('#', '');
  const normalized =
    clean.length === 3
      ? clean
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : clean;

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    return `rgba(255,255,255,${alpha})`;
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

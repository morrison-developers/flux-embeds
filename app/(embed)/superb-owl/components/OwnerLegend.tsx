'use client';

import type { BoardOwner } from '@/src/types/superbowl';
import styles from '../superbowl.module.css';

export function OwnerLegend({ owners }: { owners: BoardOwner[] }) {
  if (owners.length === 0) {
    return <div className={`${styles.card} ${styles.legendEmpty}`}>No owners configured.</div>;
  }

  return (
    <div className={`${styles.card} ${styles.legend}`}>
      {owners.map((owner) => (
        <div key={owner.id} className={styles.legendRow}>
          <span
            className={styles.legendInitials}
            style={{ background: owner.bgColor, color: owner.textColor }}
          >
            {owner.initials}
          </span>
          <span className={styles.legendName}>{owner.displayName}</span>
        </div>
      ))}
    </div>
  );
}

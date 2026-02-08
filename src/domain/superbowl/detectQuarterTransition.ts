import type { GameSnapshot } from '@/src/types/superbowl';

export function detectQuarterTransition(
  previous: GameSnapshot | null,
  next: GameSnapshot
): { finalizedQuarter?: number } {
  if (!previous) {
    return {};
  }

  if (next.period <= previous.period) {
    return {};
  }

  // Transition from period N to N+ indicates N is finalized.
  return { finalizedQuarter: previous.period };
}

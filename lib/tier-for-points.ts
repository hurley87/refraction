import type { Tier } from '@/lib/types';

/**
 * Pure tier lookup for a point total (no I/O). Shared by DB helpers and client UI.
 */
export function resolveTierForPoints(
  tiers: Tier[],
  totalPoints: number
): Tier | null {
  return (
    tiers.find(
      (tier) =>
        totalPoints >= tier.min_points &&
        (tier.max_points === null || totalPoints < tier.max_points)
    ) ?? null
  );
}

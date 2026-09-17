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

/** Tiers sorted by floor, lowest first. */
export function sortTiersByMinPoints(tiers: Tier[]): Tier[] {
  return [...tiers].sort((a, b) => a.min_points - b.min_points);
}

/**
 * The next membership tier above `current`, or null at the top.
 */
export function findNextTier(tiers: Tier[], current: Tier): Tier | null {
  return (
    sortTiersByMinPoints(tiers).find(
      (tier) => tier.min_points > current.min_points
    ) ?? null
  );
}

/**
 * Dashboard progress line: remaining points to the next tier, or TOP TIER.
 * e.g. "5,400 TO RESIDENT"
 */
export function formatNextTierProgress(
  totalPoints: number,
  nextTier: Tier | null
): string {
  if (!nextTier) return 'TOP TIER';
  const remaining = Math.max(0, nextTier.min_points - totalPoints);
  return `${remaining.toLocaleString('en-US')} TO ${nextTier.title.toUpperCase()}`;
}

export function formatTierPointRange(tier: Tier): string {
  if (tier.max_points === null) {
    return `${tier.min_points.toLocaleString('en-US')}+`;
  }
  return `${tier.min_points.toLocaleString('en-US')} – ${tier.max_points.toLocaleString('en-US')}`;
}

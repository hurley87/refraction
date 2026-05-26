import type { Tier } from '@/lib/types';
import { resolveTierForPoints } from '@/lib/tier-for-points';

/** Tier title for display after a points balance change (uses shared tier window logic). */
export function resolveTierTitleForPoints(
  tiers: Tier[] | undefined,
  totalPoints: number
): string | null {
  if (!tiers?.length) return null;
  return resolveTierForPoints(tiers, totalPoints)?.title ?? null;
}

/** Compact tier badge for activation success (uppercase title + floor). */
export function formatActivationTierBadge(tier: Tier): string {
  const title = tier.title.trim().toUpperCase();
  const floor = tier.min_points.toLocaleString();
  return `${title} • ${floor}+`;
}

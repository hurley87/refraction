import type { Tier } from '@/lib/types';

/** Client-safe tier resolution (mirrors `lib/db/tiers.resolveTierForPoints`). */
export function resolveTierTitleForPoints(
  tiers: Tier[] | undefined,
  totalPoints: number
): string | null {
  if (!tiers?.length) return null;
  const tier = tiers.find(
    (t) =>
      totalPoints >= t.min_points &&
      (t.max_points === null || totalPoints < t.max_points)
  );
  return tier?.title ?? null;
}

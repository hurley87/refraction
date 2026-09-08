import type { Perk } from '@/lib/types';

export const MAX_HOMEPAGE_PERKS = 5;

/**
 * Featured perk first, then newest remaining, capped for the homepage grid.
 */
export function pickHomepagePerks(perks: Perk[]): Perk[] {
  const withId = perks.filter((perk): perk is Perk & { id: string } =>
    Boolean(perk.id)
  );
  const featured = withId.filter((perk) => perk.is_featured);
  const rest = withId.filter((perk) => !perk.is_featured);
  return [...featured, ...rest].slice(0, MAX_HOMEPAGE_PERKS);
}

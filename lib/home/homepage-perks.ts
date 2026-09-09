import type { Perk } from '@/lib/types';

/** One hero tile plus five carousel tiles. */
export const MAX_HOMEPAGE_PERKS = 6;

/**
 * Venue / place perk types shown on the homepage. Digital types
 * (`software`, `membership`, `mobility`) stay on /rewards only.
 */
export const HOMEPAGE_LOCATION_PERK_TYPES = [
  'bar',
  'cafe',
  /** Some rows were saved with the plural category slug. */
  'cafes',
  'club',
  'coffee',
  'conference',
  'festival',
  'gallery',
  'hotel',
  'in-between',
  'performance-venue',
  'restaurant',
] as const;

const LOCATION_PERK_TYPE_SET = new Set<string>(HOMEPAGE_LOCATION_PERK_TYPES);

export function isHomepageLocationPerk(perk: Perk): boolean {
  return LOCATION_PERK_TYPE_SET.has(perk.type?.trim().toLowerCase() ?? '');
}

function createdAtMs(perk: Perk): number {
  const parsed = Date.parse(perk.created_at ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function byNewestFirst(a: Perk, b: Perk): number {
  return createdAtMs(b) - createdAtMs(a);
}

/**
 * Venue types only, newest first. Featured venue perk leads, then remaining
 * newest-to-oldest, capped for the homepage.
 */
export function pickHomepagePerks(perks: Perk[]): Perk[] {
  const withId = perks.filter(
    (perk): perk is Perk & { id: string } =>
      Boolean(perk.id) && isHomepageLocationPerk(perk)
  );
  const featured = withId
    .filter((perk) => perk.is_featured)
    .sort(byNewestFirst);
  const rest = withId.filter((perk) => !perk.is_featured).sort(byNewestFirst);
  return [...featured, ...rest].slice(0, MAX_HOMEPAGE_PERKS);
}

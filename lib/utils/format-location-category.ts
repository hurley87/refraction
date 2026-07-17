import type { LocationCategory } from '@/lib/types';

/** Category shape accepted by the display helpers (embedded `categories` row). */
type CategoryLike = Pick<LocationCategory, 'name'> | null | undefined;

/** Human-readable label for a location's venue category (matches check-in dialog). */
export function formatLocationCategory(category: CategoryLike) {
  const name = category?.name?.trim();
  return name || 'Location';
}

/** True when the category label is a single word (e.g. "Restaurant", not "Performance Venue"). */
export function isSingleWordLocationCategory(category: CategoryLike): boolean {
  return !/\s/.test(formatLocationCategory(category).trim());
}

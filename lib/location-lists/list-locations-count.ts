/**
 * Safe location count when list payloads omit or null `locations`
 * (Supabase joins, React Query cache, or partial API responses).
 */
export function listLocationsCount(
  locations: readonly unknown[] | null | undefined
): number {
  return locations?.length ?? 0;
}

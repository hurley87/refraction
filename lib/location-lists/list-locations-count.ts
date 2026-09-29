/**
 * Coerce API / cache payloads to an array before `.map` / iteration.
 * Non-arrays (including strings with `.length`) become `[]`.
 */
export function coerceToArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Safe location count when list payloads omit or null `locations`
 * (Supabase joins, React Query cache, or partial API responses).
 */
export function listLocationsCount(locations: unknown): number {
  return coerceToArray(locations).length;
}

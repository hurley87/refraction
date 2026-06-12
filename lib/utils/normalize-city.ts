/**
 * City normalization helpers used to map free-text / external city strings
 * (e.g. DICE `venue.city`) onto a canonical city slug.
 */

export interface CityMatcherEntry {
  slug: string;
  name: string;
  aliases: string[];
}

/**
 * Normalize a city string into a comparison key: lowercase, trimmed, and with
 * runs of non-alphanumeric characters collapsed to a single space.
 * e.g. "New York City " -> "new york city", "N.Y.C." -> "n y c".
 */
export function normalizeCityKey(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Build a lookup from normalized name/alias -> canonical city slug.
 * Later entries do not override earlier ones, so order cities by priority
 * (e.g. sort_order) before calling if collisions are possible.
 */
export function buildCityMatcher(
  cities: CityMatcherEntry[]
): (cityText: string | null | undefined) => string | null {
  const lookup = new Map<string, string>();

  for (const city of cities) {
    const keys = [city.name, ...city.aliases];
    for (const key of keys) {
      const normalized = normalizeCityKey(key);
      if (normalized && !lookup.has(normalized)) {
        lookup.set(normalized, city.slug);
      }
    }
  }

  return (cityText) => {
    const normalized = normalizeCityKey(cityText);
    if (!normalized) return null;
    return lookup.get(normalized) ?? null;
  };
}

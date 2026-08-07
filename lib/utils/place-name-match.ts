/**
 * Normalize venue names for Mapbox ↔ IRL matching.
 * Strips apostrophes so "Bambi's" matches "Bambis".
 */
export function normalizePlaceName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['\u2019\u2018\u2032]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Score how well a candidate IRL name matches a Mapbox search name.
 * Higher is better; 0 means not a usable match (avoids snapping to a neighbor POI).
 */
export function placeNameMatchScore(
  searchName: string,
  candidateName: string
): number {
  const a = normalizePlaceName(searchName);
  const b = normalizePlaceName(candidateName);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 80;

  const aTokens = new Set(a.split(' ').filter(Boolean));
  const bTokens = new Set(b.split(' ').filter(Boolean));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }
  const ratio = overlap / Math.max(aTokens.size, bTokens.size);
  // Require most tokens to overlap so "Standard Time" ≠ "Blood Brothers"
  if (ratio >= 0.67 && overlap >= 2) return Math.round(ratio * 60);
  if (ratio === 1) return 70;
  return 0;
}

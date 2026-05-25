/** Human-readable label for a location `type` (matches check-in dialog). */
export function formatLocationCategory(type?: string | null) {
  const normalized = (type ?? 'location').trim();
  if (!normalized) return 'Location';
  return normalized
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** True when the formatted category is a single word (e.g. "Restaurant", not "Coffee Shop"). */
export function isSingleWordLocationCategory(type?: string | null): boolean {
  const label = formatLocationCategory(type);
  return !/\s/.test(label.trim());
}

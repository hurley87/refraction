/** Human-readable label for a location `type` (matches check-in dialog). */
export function formatLocationCategory(type?: string | null) {
  const normalized = (type ?? 'location').trim();
  if (!normalized) return 'Location';
  return normalized
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

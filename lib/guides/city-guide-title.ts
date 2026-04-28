/** Display headline for city guides: prefers `title_prefix`; merges legacy `city_name` until re-saved. */
export function cityGuideDisplayTitle(parts: {
  title_prefix?: string | null;
  city_name?: string | null;
}): string {
  const p = parts.title_prefix?.trim() ?? '';
  const c = parts.city_name?.trim() ?? '';
  if (p && c) return `${p} ${c}`;
  return p || c;
}

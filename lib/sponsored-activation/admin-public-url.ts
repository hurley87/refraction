/** Public App Router path for a sponsored activation (id or slug). */
export function sponsoredActivationPublicPath(activationKey: string): string {
  const key = activationKey.trim();
  if (!key) return '/activation';
  return `/activation/${encodeURIComponent(key)}`;
}

/** Absolute URL for sharing (requires a browser or configured site origin). */
export function sponsoredActivationPublicUrl(
  activationKey: string,
  origin: string
): string {
  const base = origin.replace(/\/$/, '');
  return `${base}${sponsoredActivationPublicPath(activationKey)}`;
}

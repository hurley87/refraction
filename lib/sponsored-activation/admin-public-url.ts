/** `/activation/{key}` for sharing; empty key yields `/activation`. */
export function sponsoredActivationPublicPath(activationKey: string): string {
  const key = activationKey.trim();
  if (!key) return '/activation';
  return `/activation/${encodeURIComponent(key)}`;
}

/** Joins normalized `origin` with the public activation path. */
export function sponsoredActivationPublicUrl(
  activationKey: string,
  origin: string
): string {
  const base = origin.replace(/\/$/, '');
  return `${base}${sponsoredActivationPublicPath(activationKey)}`;
}

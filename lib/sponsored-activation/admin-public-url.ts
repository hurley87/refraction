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

const QR_GUEST_SOURCE = 'qr_scan' as const;

/**
 * `/activation/{key}` with `source=qr_scan` and `source_ref_id` for guest QR
 * eligibility deeplinks (see `parseSponsoredActivationEligibilityDeeplink`).
 */
export function sponsoredActivationQrGuestSharePath(
  activationKey: string,
  sourceRefId: string
): string {
  const path = sponsoredActivationPublicPath(activationKey);
  const ref = sourceRefId.trim();
  if (!ref) return path;
  const q = new URLSearchParams({
    source: QR_GUEST_SOURCE,
    source_ref_id: ref,
  });
  return `${path}?${q.toString()}`;
}

/** Same as {@link sponsoredActivationQrGuestSharePath} with an absolute origin. */
export function sponsoredActivationQrGuestShareUrl(
  activationKey: string,
  origin: string,
  sourceRefId: string
): string {
  const base = origin.replace(/\/$/, '');
  return `${base}${sponsoredActivationQrGuestSharePath(activationKey, sourceRefId)}`;
}

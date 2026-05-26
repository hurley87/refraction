/** `/activation/{key}` for sharing; empty key yields `/activation`. */
export function sponsoredActivationPublicPath(activationKey: string): string {
  const key = activationKey.trim();
  if (!key) return '/activation';
  return `/activation/${encodeURIComponent(key)}`;
}

function joinOriginAndPath(origin: string, path: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}${path}`;
}

/** Joins normalized `origin` with the public activation path. */
export function sponsoredActivationPublicUrl(
  activationKey: string,
  origin: string
): string {
  return joinOriginAndPath(
    origin,
    sponsoredActivationPublicPath(activationKey)
  );
}

/** Value for `source_ref_id` on guest QR share links: title, else trimmed slug, else id. */
export function sponsoredActivationQrGuestShareSourceRefId(row: {
  id: string;
  slug: string;
  title: string;
}): string {
  return row.title.trim() || row.slug.trim() || row.id;
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
  return joinOriginAndPath(
    origin,
    sponsoredActivationQrGuestSharePath(activationKey, sourceRefId)
  );
}

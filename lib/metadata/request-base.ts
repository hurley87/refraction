const LINK_PREVIEW_FILE = 'IRL WEB PREVIEW_01.png';

/** Production canonical origin (Vercel redirects apex → www). */
export const PRODUCTION_METADATA_ORIGIN = 'https://www.irl.energy';

/** Strip port from `Host` / `X-Forwarded-Host` (e.g. `www.irl.energy:443`). */
export function stripHostPort(host: string): string {
  const trimmed = host.split(',')[0].trim().toLowerCase();
  if (!trimmed) return '';

  if (trimmed.startsWith('[')) {
    const end = trimmed.indexOf(']');
    return end >= 0 ? trimmed.slice(1, end) : trimmed;
  }

  const colon = trimmed.lastIndexOf(':');
  if (colon > -1 && /^\d+$/.test(trimmed.slice(colon + 1))) {
    return trimmed.slice(0, colon);
  }

  return trimmed;
}

/** Normalize apex + www to the canonical production metadata origin. */
export function normalizeProductionMetadataBase(url: URL): URL {
  if (url.hostname === 'irl.energy' || url.hostname === 'www.irl.energy') {
    return new URL(PRODUCTION_METADATA_ORIGIN);
  }
  return url;
}

/** Fallback site origin for metadata (build time, or when the request host is unknown). */
export function getDefaultMetadataBase(): URL {
  const raw =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    PRODUCTION_METADATA_ORIGIN;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return normalizeProductionMetadataBase(
    new URL(withProtocol.replace(/\/$/, ''))
  );
}

/**
 * X / Facebook / Telegram compare the request URL to og:url and image URLs. If
 * everything is hard-coded to `irl.energy` but the link is shared as
 * `www.irl.energy`, the card can fail. Only allow our domains + dev hosts.
 */
export function isAllowedMetadataHost(host: string): boolean {
  const normalized = stripHostPort(host);
  if (normalized === 'irl.energy' || normalized === 'www.irl.energy') {
    return true;
  }
  if (
    normalized.startsWith('localhost') ||
    normalized.startsWith('127.0.0.1')
  ) {
    return true;
  }
  if (normalized.endsWith('.vercel.app')) return true;
  return false;
}

/** Default site-wide link preview image (absolute URL). */
export function defaultLinkPreviewImageUrl(metadataBase: URL): string {
  return `${metadataBase.origin}/link-preview/${encodeURIComponent(LINK_PREVIEW_FILE)}?v=1`;
}

/**
 * `metadataBase` + default OG image for this request (canonical www on production,
 * preview domain, local dev).
 */
export function getMetadataBaseForRequest(h: Pick<Headers, 'get'>): {
  metadataBase: URL;
  imageUrl: string;
} {
  const forwarded = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  const host = stripHostPort(forwarded);
  if (!host || !isAllowedMetadataHost(host)) {
    const metadataBase = getDefaultMetadataBase();
    return {
      metadataBase,
      imageUrl: defaultLinkPreviewImageUrl(metadataBase),
    };
  }

  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const protoHeader = h.get('x-forwarded-proto')?.split(',')[0].trim();
  const protocol =
    isLocal && protoHeader === 'https' ? 'https' : isLocal ? 'http' : 'https';
  const metadataBase =
    host === 'irl.energy' || host === 'www.irl.energy'
      ? new URL(PRODUCTION_METADATA_ORIGIN)
      : new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    imageUrl: defaultLinkPreviewImageUrl(metadataBase),
  };
}

/** Resolve a CMS or relative asset path to an absolute URL for OG/Twitter. */
export function toAbsoluteMetadataImageUrl(
  image: string,
  metadataBase: URL
): string {
  const trimmed = image.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return new URL(
    trimmed.startsWith('/') ? trimmed : `/${trimmed}`,
    metadataBase
  ).href;
}

const LINK_PREVIEW_FILE = 'og-default.png';

/** Production canonical origin (Vercel redirects apex → www). */
export const PRODUCTION_METADATA_ORIGIN = 'https://www.irl.energy';

/** Actual dimensions of `public/link-preview/og-default.png`. */
export const DEFAULT_LINK_PREVIEW_IMAGE_WIDTH = 1200;
export const DEFAULT_LINK_PREVIEW_IMAGE_HEIGHT = 628;

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
  return new URL(`/link-preview/${LINK_PREVIEW_FILE}`, metadataBase).href;
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

const SUPABASE_OBJECT_SEGMENT = '/storage/v1/object/public/';
const SUPABASE_RENDER_SEGMENT = '/storage/v1/render/image/public/';

function socialPreviewImageType(url: string): string | undefined {
  if (/\.png(?:$|\?)/i.test(url)) return 'image/png';
  if (/\.jpe?g(?:$|\?)/i.test(url)) return 'image/jpeg';
  if (/\.gif(?:$|\?)/i.test(url)) return 'image/gif';
  return undefined;
}

/**
 * Supabase storage public object URL → image-transform (`render/image`) URL.
 * The transform endpoint always re-encodes to JPEG, which fixes Slack /
 * iMessage / LinkedIn previews (they do not render WebP `og:image`). Returns
 * `null` for non-Supabase URLs.
 */
function supabaseRenderImageUrl(absolute: string): string | null {
  if (!absolute.includes(SUPABASE_OBJECT_SEGMENT)) return null;
  const url = new URL(
    absolute.replace(SUPABASE_OBJECT_SEGMENT, SUPABASE_RENDER_SEGMENT)
  );
  url.searchParams.set('width', '1200');
  url.searchParams.set('height', '630');
  url.searchParams.set('resize', 'cover');
  url.searchParams.set('quality', '80');
  return url.href;
}

/**
 * Resolve a share image to a Slack-safe `og:image`. Slack (and several other
 * unfurlers) cannot render WebP, while X/Twitter can — this is why WebP heroes
 * preview on Twitter but not Slack.
 *
 * - Supabase storage images are routed through the transform endpoint so they
 *   are served as JPEG (dimensions vary by source, so they are not declared).
 * - Other WebP URLs we cannot transform fall back to the branded site PNG.
 * - Everything else passes through with a best-effort MIME type.
 */
export function toSocialPreviewImageUrl(
  image: string,
  metadataBase: URL
): { url: string; type?: string; width?: number; height?: number } {
  const absolute = toAbsoluteMetadataImageUrl(image, metadataBase);

  const rendered = supabaseRenderImageUrl(absolute);
  if (rendered) {
    return { url: rendered, type: 'image/jpeg' };
  }

  if (/\.webp(?:$|\?)/i.test(absolute)) {
    return {
      url: defaultLinkPreviewImageUrl(metadataBase),
      type: 'image/png',
      width: DEFAULT_LINK_PREVIEW_IMAGE_WIDTH,
      height: DEFAULT_LINK_PREVIEW_IMAGE_HEIGHT,
    };
  }

  return { url: absolute, type: socialPreviewImageType(absolute) };
}

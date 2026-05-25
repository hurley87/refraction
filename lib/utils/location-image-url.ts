/** Display widths (px) at 2× retina for map UI surfaces. */
export const LOCATION_IMAGE_SIZES = {
  pin: 56,
  drawer: 288,
  card: 720,
} as const;

const DEFAULT_QUALITY = 75;

const SUPABASE_HOST_SUFFIX = '.supabase.co';

/**
 * Returns true when the URL can be resized via the Next.js image optimizer
 * (Supabase public storage hosts are allowlisted in next.config.mjs).
 */
export function isOptimizableLocationImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname.endsWith(SUPABASE_HOST_SUFFIX)
    );
  } catch {
    return false;
  }
}

/** Build a `/_next/image` proxy URL for remote Supabase assets. */
export function buildNextImageUrl(
  url: string,
  width: number,
  quality: number = DEFAULT_QUALITY
): string {
  const params = new URLSearchParams({
    url,
    w: String(width),
    q: String(quality),
  });
  return `/_next/image?${params.toString()}`;
}

function optimizeOrRaw(url: string, width: number): string {
  if (isOptimizableLocationImageUrl(url)) {
    return buildNextImageUrl(url, width);
  }
  return url;
}

/** Pin locator (~28px display). Prefers pre-generated thumb; otherwise full image URL. */
export function getLocationPinImageUrl(
  url: string | null | undefined,
  thumbUrl?: string | null | undefined
): string | null {
  const trimmedThumb = thumbUrl?.trim();
  if (trimmedThumb) return trimmedThumb;
  if (!url) return null;
  return url;
}

/** MapCard / check-in hero (~361px display at 2×). */
export function getLocationCardImageUrl(
  url: string | null | undefined
): string | null {
  if (!url) return null;
  return optimizeOrRaw(url, LOCATION_IMAGE_SIZES.card);
}

/** Discover drawer tile (~144px display at 2×). */
export function getLocationDrawerImageUrl(
  url: string | null | undefined
): string | null {
  if (!url) return null;
  return optimizeOrRaw(url, LOCATION_IMAGE_SIZES.drawer);
}

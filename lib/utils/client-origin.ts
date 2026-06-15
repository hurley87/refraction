import { PRODUCTION_METADATA_ORIGIN } from '@/lib/metadata/request-base';

/** Canonical production app origin for client fallbacks. */
export const DEFAULT_CLIENT_ORIGIN = PRODUCTION_METADATA_ORIGIN;

/**
 * Best-effort browser origin for share links and client-side API proxies.
 * Some in-app WebViews expose `window` but not `window.location`.
 */
export function getBrowserOrigin(
  fallback: string = DEFAULT_CLIENT_ORIGIN
): string {
  if (typeof window === 'undefined') return fallback;

  try {
    const origin = window.location?.origin;
    return origin && origin !== 'null' ? origin : fallback;
  } catch {
    return fallback;
  }
}

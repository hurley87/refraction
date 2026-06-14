import { PRODUCTION_METADATA_ORIGIN } from '@/lib/metadata/request-base';

const DEFAULT_CLIENT_ORIGIN = PRODUCTION_METADATA_ORIGIN;

/**
 * Safe browser origin for absolute URLs. Some in-app WebViews expose `window`
 * but not `window.location`; unguarded `window.location.origin` throws
 * `Cannot read properties of undefined (reading 'origin')`.
 */
export function getClientOrigin(
  fallback: string = DEFAULT_CLIENT_ORIGIN
): string {
  if (typeof window === 'undefined') return fallback;

  try {
    return window.location?.origin ?? fallback;
  } catch {
    return fallback;
  }
}

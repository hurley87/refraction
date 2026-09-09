import { PRODUCTION_METADATA_ORIGIN } from '@/lib/metadata/request-base';

const CURATED_LIST_PATH_PREFIX = '/map/lists';

/** Query keys that own the map besides a curated-list deep link. */
const CONFLICTING_SEARCH_KEYS = [
  'placeId',
  'listId',
  'profileListId',
  'mapCard',
  'name',
  'placeName',
] as const;

export function normalizeCuratedListSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

/** Same-origin path for a curated list on the map: `/map/lists/{slug}`. */
export function buildCuratedListMapHref(slug: string): string {
  const normalized = normalizeCuratedListSlug(slug);
  return `${CURATED_LIST_PATH_PREFIX}/${encodeURIComponent(normalized)}`;
}

/** Absolute share URL: irl.energy/map/lists/{slug}. */
export function buildCuratedListMapUrl(input: {
  slug: string;
  /** Overrides the canonical origin (e.g. the current browser origin). */
  origin?: string;
}): string {
  const origin =
    input.origin?.trim().replace(/\/+$/, '') || PRODUCTION_METADATA_ORIGIN;
  return `${origin}${buildCuratedListMapHref(input.slug)}`;
}

/**
 * Accept a bare slug, `/map/lists/{slug}`, or a full IRL URL and return the
 * normalized slug. Returns null when the value is empty or not a curated-list
 * address.
 */
export function parseCuratedListSlugInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let path = trimmed;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    try {
      path = new URL(trimmed).pathname;
    } catch {
      return null;
    }
  }

  const pathForLookup = path.startsWith('/') ? path : `/${path}`;
  const pathOnly = pathForLookup.split(/[?#]/, 1)[0];
  const fromPath = curatedListSlugFromPathname(pathOnly);
  if (fromPath) return fromPath;

  const normalized = normalizeCuratedListSlug(trimmed);
  if (!normalized || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    return null;
  }
  return normalized;
}

/** Slug from `/map/lists/{slug}`, or null if the path is not a curated list URL. */
export function curatedListSlugFromPathname(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  const prefix = `${CURATED_LIST_PATH_PREFIX}/`;
  if (!path.startsWith(prefix)) return null;

  const rest = path.slice(prefix.length);
  if (!rest || rest.includes('/')) return null;

  try {
    return normalizeCuratedListSlug(decodeURIComponent(rest));
  } catch {
    return null;
  }
}

export function isInteractiveMapPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path === '/interactive-map';
}

/**
 * True when the current query is not already driving another map deep link
 * (place card, player list, etc.).
 */
export function canSyncCuratedListUrl(searchParams: URLSearchParams): boolean {
  return CONFLICTING_SEARCH_KEYS.every((key) => !searchParams.get(key));
}

/** Keep `returnTo` when replacing between map list URLs. */
export function hrefWithReturnTo(
  href: string,
  returnTo: string | null | undefined
): string {
  const trimmed = returnTo?.trim();
  if (!trimmed) return href;
  const params = new URLSearchParams();
  params.set('returnTo', trimmed);
  return `${href}?${params.toString()}`;
}

/**
 * Next path to `router.replace` so curated list detail stays shareable.
 * Returns null when the URL should not change (wrong page, conflicting query,
 * or already on the target).
 */
export function curatedListUrlSyncTarget(input: {
  pathname: string;
  searchParams: URLSearchParams;
  curatedSlug: string | null;
}): string | null {
  if (!canSyncCuratedListUrl(input.searchParams)) return null;

  const returnTo = input.searchParams.get('returnTo');
  const currentSlug = curatedListSlugFromPathname(input.pathname);
  const onInteractiveMap = isInteractiveMapPath(input.pathname);

  if (input.curatedSlug) {
    if (!currentSlug && !onInteractiveMap) return null;
    const nextHref = hrefWithReturnTo(
      buildCuratedListMapHref(input.curatedSlug),
      returnTo
    );
    if (currentSlug === normalizeCuratedListSlug(input.curatedSlug)) {
      return null;
    }
    return nextHref;
  }

  if (!currentSlug) return null;
  return hrefWithReturnTo('/interactive-map', returnTo);
}

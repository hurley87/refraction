/** Distinguishes the guide hero map image from later guide → map links. */
export const GUIDE_MAP_IMAGE_PLACEMENT = 'map_image';

export type GuideMapClickedProperties = {
  guide_slug: string;
  city: string;
  map_list_slug: string;
  placement: typeof GUIDE_MAP_IMAGE_PLACEMENT;
};

export type MapListViewedProperties = {
  map_list_slug: string;
  guide_slug?: string;
};

/**
 * Guide slug from `?returnTo=/city-guides/<slug>` (or an editorial path).
 * Returns null when the back link is not a guide article.
 */
export function guideSlugFromCityGuideReturnPath(
  returnPath: string | null | undefined
): string | null {
  if (returnPath == null) return null;
  const path = returnPath.trim().split(/[?#]/, 1)[0]?.replace(/\/+$/, '') ?? '';
  const editorial = path.match(/^\/city-guides\/editorial\/([^/]+)$/);
  const cityGuide = path.match(/^\/city-guides\/([^/]+)$/);
  const raw = editorial?.[1] ?? cityGuide?.[1];
  if (!raw || raw === 'editorial') return null;
  try {
    const slug = decodeURIComponent(raw).trim();
    return slug || null;
  } catch {
    return null;
  }
}

export function guideMapClickedProperties(input: {
  guideSlug: string;
  city: string;
  mapListSlug: string;
}): GuideMapClickedProperties {
  return {
    guide_slug: input.guideSlug,
    city: input.city,
    map_list_slug: input.mapListSlug,
    placement: GUIDE_MAP_IMAGE_PLACEMENT,
  };
}

export function mapListViewedProperties(input: {
  mapListSlug: string;
  returnTo?: string | null;
}): MapListViewedProperties {
  const guideSlug = guideSlugFromCityGuideReturnPath(input.returnTo);
  return {
    map_list_slug: input.mapListSlug,
    ...(guideSlug ? { guide_slug: guideSlug } : {}),
  };
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Include locations within this distance (km) of the visible viewport. */
export const VIEWPORT_NEARBY_RADIUS_KM = 25;

/** Normalize coordinates that may arrive as numbers or strings from the API. */
export function parseLatLng(
  latitude: unknown,
  longitude: unknown
): LatLng | null {
  const lat =
    typeof latitude === 'number'
      ? latitude
      : typeof latitude === 'string'
        ? parseFloat(latitude)
        : NaN;
  const lng =
    typeof longitude === 'number'
      ? longitude
      : typeof longitude === 'string'
        ? parseFloat(longitude)
        : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { latitude: lat, longitude: lng };
}

/** Check if a point is within map bounds (handles anti-meridian crossing). */
export function isPointInBounds(point: LatLng, bounds: MapBounds): boolean {
  const { latitude, longitude } = point;
  const { north, south, east, west } = bounds;

  if (latitude < south || latitude > north) {
    return false;
  }

  if (west > east) {
    return longitude >= west || longitude <= east;
  }

  return longitude >= west && longitude <= east;
}

/**
 * Expand a lat/lng bounding box by roughly `radiusKm` in all directions.
 * Uses the box center latitude for longitude scaling.
 */
export function expandMapBoundsByKm(
  bounds: MapBounds,
  radiusKm: number
): MapBounds {
  const centerLat = (bounds.north + bounds.south) / 2;
  const latRad = (centerLat * Math.PI) / 180;
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos(latRad);
  const radiusM = radiusKm * 1000;
  const deltaLat = radiusM / mPerDegLat;
  const deltaLng = mPerDegLng > 1e-6 ? radiusM / mPerDegLng : 360;

  const north = Math.min(90, bounds.north + deltaLat);
  const south = Math.max(-90, bounds.south - deltaLat);

  if (bounds.west <= bounds.east) {
    return {
      north,
      south,
      west: Math.max(-180, bounds.west - deltaLng),
      east: Math.min(180, bounds.east + deltaLng),
    };
  }

  return {
    north,
    south,
    west: bounds.west - deltaLng,
    east: bounds.east + deltaLng,
  };
}

/** Visible viewport expanded by {@link VIEWPORT_NEARBY_RADIUS_KM}. */
export function getEffectiveMapBounds(
  mapBounds: MapBounds | null | undefined,
  radiusKm: number = VIEWPORT_NEARBY_RADIUS_KM
): MapBounds | null {
  if (!mapBounds) return null;
  return expandMapBoundsByKm(mapBounds, radiusKm);
}

/** Filter items with lat/lng fields to those within effective map bounds. */
export function filterByMapBounds<
  T extends { latitude: unknown; longitude: unknown },
>(
  items: T[],
  mapBounds: MapBounds | null | undefined,
  options?: {
    radiusKm?: number;
    /** Always include these place_ids even if outside bounds. */
    alwaysIncludePlaceIds?: Iterable<string>;
  }
): T[] {
  const effective = getEffectiveMapBounds(mapBounds, options?.radiusKm);
  if (!effective) return items;

  const forceInclude = new Set(options?.alwaysIncludePlaceIds ?? []);

  return items.filter((item) => {
    const placeId =
      'place_id' in item && typeof item.place_id === 'string'
        ? item.place_id
        : null;
    if (placeId && forceInclude.has(placeId)) {
      return true;
    }

    const coords = parseLatLng(item.latitude, item.longitude);
    if (!coords) return false;
    return isPointInBounds(coords, effective);
  });
}

/**
 * Helper to strip a leading name prefix from a place-formatted address string.
 * Used when Mapbox returns "POI Name, Full Address" to avoid duplicating the POI name.
 */
function stripLeadingNameFromPlaceFormatted(
  name: string | undefined,
  placeFormatted: string | undefined
): string {
  if (!name || !placeFormatted) return placeFormatted || '';
  const prefix = `${name}, `;
  if (placeFormatted.startsWith(prefix)) {
    return placeFormatted.slice(prefix.length);
  }
  return placeFormatted;
}

/**
 * Derives display name and address from Mapbox search result data.
 *
 * Rules:
 * - If feature_type is "poi": displayName = name (spot name), address = placeFormatted (full address, with POI name prefix stripped if present)
 * - Otherwise (address-like or unknown): displayName = "" (empty, admin can fill), address = placeFormatted || name
 *
 * @param params - Mapbox search result data
 * @returns Object with displayName and address fields
 */
/** Haversine distance in meters between two WGS84 points. */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const earth = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earth * c;
}

/** Max distance from click to POI geometry to allow using the POI as the location name. */
export const DEFAULT_MAX_POI_NAME_DISTANCE_M = 28;
/**
 * When both POI and address features have coordinates, the POI must not be farther from the
 * click than the address by more than this buffer (meters). Stops adjacent lots inheriting a neighbor POI.
 */
export const DEFAULT_POI_VS_ADDRESS_BUFFER_M = 5;

export type ClickPoint = { latitude: number; longitude: number };

export type PoiNameSpatialOptions = {
  click: ClickPoint;
  /** @default DEFAULT_MAX_POI_NAME_DISTANCE_M */
  maxPoiNameDistanceMeters?: number;
  /** @default DEFAULT_POI_VS_ADDRESS_BUFFER_M */
  poiVsAddressBufferMeters?: number;
};

/** Minimal Mapbox Geocoding v5 feature shape for reverse-geocode merging. */
export type MapboxGeocodeFeature = {
  id?: string;
  text?: string;
  place_name?: string;
  place_type?: string[];
  geometry?: { type?: string; coordinates?: [number, number] };
};

/** GeoJSON point and/or Search Box `properties.coordinates`. */
function lngLatFromMapFeature(
  f:
    | {
        geometry?: { coordinates?: [number, number] };
        properties?: {
          coordinates?: { latitude?: number; longitude?: number };
        };
      }
    | null
    | undefined
): { lng: number; lat: number } | null {
  const c = f?.geometry?.coordinates;
  if (c && c.length >= 2) return { lng: c[0], lat: c[1] };
  const p = f?.properties?.coordinates;
  if (p?.latitude != null && p.longitude != null) {
    return { lng: p.longitude, lat: p.latitude };
  }
  return null;
}

/**
 * Use POI-derived name only when the click is near the POI and not clearly closer to the address
 * feature (e.g. next door should use street address as name, not the neighboring business).
 */
export function shouldUsePoiNameForClick(
  poiFeature: Parameters<typeof lngLatFromMapFeature>[0],
  addressFeature: Parameters<typeof lngLatFromMapFeature>[0],
  options: PoiNameSpatialOptions
): boolean {
  const poiPt = lngLatFromMapFeature(poiFeature);
  if (!poiPt) return false;

  const { click, maxPoiNameDistanceMeters, poiVsAddressBufferMeters } = options;
  const maxD = maxPoiNameDistanceMeters ?? DEFAULT_MAX_POI_NAME_DISTANCE_M;
  const buffer = poiVsAddressBufferMeters ?? DEFAULT_POI_VS_ADDRESS_BUFFER_M;

  const dPoi = haversineDistanceMeters(
    click.latitude,
    click.longitude,
    poiPt.lat,
    poiPt.lng
  );
  if (dPoi > maxD) return false;

  const addrPt = lngLatFromMapFeature(addressFeature);
  if (!addrPt) return true;

  const dAddr = haversineDistanceMeters(
    click.latitude,
    click.longitude,
    addrPt.lat,
    addrPt.lng
  );
  return dPoi <= dAddr + buffer;
}

/**
 * Merges parallel reverse-geocode results: `types=poi` and `types=address` (each limit=1).
 * When a POI exists, use it for the business name; prefer the address lookup for the street line.
 */
/** Search Box retrieve/reverse `properties` (subset). */
export type SearchBoxPlaceProperties = {
  name?: string;
  name_preferred?: string;
  feature_type?: string;
  full_address?: string;
  address?: string;
  place_formatted?: string;
  mapbox_id?: string;
  /** Present on some Search Box features when geometry is redundant. */
  coordinates?: { latitude?: number; longitude?: number };
};

/** Search Box `/reverse` GeoJSON feature (geometry + properties). */
export type SearchBoxReverseFeature = {
  geometry?: { type?: string; coordinates?: [number, number] };
  properties?: SearchBoxPlaceProperties;
};

export function buildFullAddressFromSearchBoxProps(
  p: SearchBoxPlaceProperties | undefined
): string {
  if (!p) return '';
  const full = p.full_address?.trim();
  if (full) return full;
  const addr = p.address?.trim();
  const place = p.place_formatted?.trim();
  if (addr && place) return `${addr}, ${place}`;
  return addr || place || '';
}

/**
 * Picks POI + address lines from Search Box `/reverse` (limit>1 returns multiple feature types).
 * Prefer POI for business name; use the address feature's full line when present.
 *
 * When `spatial` is set (map click), the POI name is only used if the click is near the POI
 * geometry and not clearly closer to the address feature than to the POI.
 */
export function mergeSearchBoxReverseFeatures(
  features: SearchBoxReverseFeature[] | undefined,
  spatial?: PoiNameSpatialOptions
): { name: string; address: string; mapboxId?: string } | null {
  if (!features?.length) return null;

  const poi = features.find((f) => f.properties?.feature_type === 'poi');
  const addr = features.find((f) => f.properties?.feature_type === 'address');

  const usePoiName =
    Boolean(poi?.properties) &&
    (!spatial || shouldUsePoiNameForClick(poi, addr, spatial));

  if (usePoiName && poi?.properties) {
    const p = poi.properties;
    const spotName = (p.name_preferred || p.name || '').trim();
    const addressLine =
      buildFullAddressFromSearchBoxProps(addr?.properties) ||
      buildFullAddressFromSearchBoxProps(p);
    return {
      name: spotName || addressLine || 'Unknown Location',
      address: addressLine || 'Unknown Location',
      mapboxId: p.mapbox_id || addr?.properties?.mapbox_id,
    };
  }

  if (addr?.properties) {
    const p = addr.properties;
    const full = buildFullAddressFromSearchBoxProps(p);
    return {
      name: full || 'Unknown Location',
      address: full || 'Unknown Location',
      mapboxId: p.mapbox_id,
    };
  }

  if (poi?.properties) {
    const full = buildFullAddressFromSearchBoxProps(poi.properties);
    return {
      name: full || 'Unknown Location',
      address: full || 'Unknown Location',
      mapboxId: poi.properties.mapbox_id,
    };
  }

  const first = features[0]?.properties;
  if (!first) return null;
  const full = buildFullAddressFromSearchBoxProps(first);
  const label = (first.name_preferred || first.name || full || '').trim();
  return {
    name: label || 'Unknown Location',
    address: full || 'Unknown Location',
    mapboxId: first.mapbox_id,
  };
}

export function mergePoiAndAddressReverseGeocode(
  poiFeature: MapboxGeocodeFeature | null | undefined,
  addressFeature: MapboxGeocodeFeature | null | undefined,
  spatial?: PoiNameSpatialOptions
): { name: string; address: string } {
  const effectivePoi =
    poiFeature &&
    (!spatial || shouldUsePoiNameForClick(poiFeature, addressFeature, spatial))
      ? poiFeature
      : undefined;

  if (effectivePoi) {
    const spotName = effectivePoi.text?.trim() || '';
    const poiPlaceName = effectivePoi.place_name || '';
    const streetAddress =
      addressFeature?.place_name?.trim() ||
      stripLeadingNameFromPlaceFormatted(spotName, poiPlaceName).trim() ||
      poiPlaceName.trim();

    return {
      name: spotName || streetAddress || 'Unknown Location',
      address: streetAddress || 'Unknown Location',
    };
  }

  if (addressFeature) {
    const full =
      addressFeature.place_name?.trim() || addressFeature.text?.trim() || '';
    return {
      name: full || 'Unknown Location',
      address: full || 'Unknown Location',
    };
  }

  return { name: 'Unknown Location', address: 'Unknown Location' };
}

export function deriveDisplayNameAndAddress(params: {
  name?: string;
  placeFormatted?: string;
  featureType?: string;
}): { displayName: string; address: string } {
  const { name, placeFormatted, featureType } = params;
  const ft = featureType?.toLowerCase();

  // POI (Point of Interest) - has a spot name
  if (ft === 'poi') {
    const displayName = name || '';
    // Strip the POI name prefix from placeFormatted if it exists
    const address = stripLeadingNameFromPlaceFormatted(
      name,
      placeFormatted
    ).trim();
    return {
      displayName,
      address: address || placeFormatted || '',
    };
  }

  // When feature_type is missing, "Name, full address" may indicate a POI. If feature_type is set,
  // do not guess — street addresses also match "92 Foo St, City, ...".
  const trimmedName = name?.trim() ?? '';
  const trimmedPlace = placeFormatted?.trim() ?? '';
  if (!ft && trimmedName && trimmedPlace.startsWith(`${trimmedName}, `)) {
    return {
      displayName: trimmedName,
      address: trimmedPlace.slice(trimmedName.length + 2).trim(),
    };
  }

  // Address-like or unknown - no spot name, just address
  return {
    displayName: '', // Leave empty for admin to fill
    address: placeFormatted || name || '',
  };
}

import type { MarkerData } from '@/components/map/interactive-map-types';
import type { DrawerLocationSummary } from '@/components/location-lists-drawer';
import { parseLatLng } from '@/lib/utils/map-bounds';

const SEARCH_NEARBY_MATCH_MAX_METERS = 120;

export function markerFromListLocation(
  location: DrawerLocationSummary,
  existing?: MarkerData
): MarkerData | null {
  const coords = parseLatLng(location.latitude, location.longitude);
  if (!coords || !location.place_id) return null;
  if (existing) return existing;
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    place_id: location.place_id,
    name: location.name,
    address: location.address ?? location.name,
    description: location.description ?? null,
    imageUrl: location.coin_image_url ?? null,
    imageThumbUrl: location.coin_image_thumb_url ?? null,
    category: location.category ?? null,
    event_url: location.event_url ?? null,
    points_value: location.points_value ?? 100,
    creator_wallet_address: null,
    creator_username: null,
  };
}

/** Great-circle distance in meters between two WGS84 points. */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const rad = Math.PI / 180;
  const φ1 = lat1 * rad;
  const φ2 = lat2 * rad;
  const Δφ = (lat2 - lat1) * rad;
  const Δλ = (lon2 - lon1) * rad;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Best map pin within ~`maxMeters` of the search coords (distinct Mapbox IDs for same venue). */
export function findNearestIrLMarker(
  list: MarkerData[],
  latitude: number,
  longitude: number,
  maxMeters = SEARCH_NEARBY_MATCH_MAX_METERS
): MarkerData | null {
  let best: MarkerData | null = null;
  let bestD = Infinity;
  for (const m of list) {
    const d = haversineDistanceMeters(
      latitude,
      longitude,
      m.latitude,
      m.longitude
    );
    if (d <= maxMeters && d < bestD) {
      best = m;
      bestD = d;
    }
  }
  return best;
}

export function findExistingMarker(
  markers: MarkerData[],
  placeId?: string | null
): MarkerData | null {
  if (!placeId) return null;
  return markers.find((marker) => marker.place_id === placeId) ?? null;
}

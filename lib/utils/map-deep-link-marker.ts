import type { LocationCategory } from '@/lib/types';

export type DeepLinkMarkerShape = {
  latitude: number;
  longitude: number;
  place_id: string;
  name: string;
  address?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  category?: LocationCategory | null;
  points_value?: number | null;
};

export type DeepLinkMarkerMeta = {
  name?: string | null;
  address?: string | null;
  imageUrl?: string | null;
};

/**
 * City-guide links pass `lat`/`lng`; use them so fly-to and MapCard still work
 * when the place is missing from the marker list (e.g. not yet loaded).
 */
export function buildDeepLinkMarkerFromQueryCoords(
  placeId: string,
  latitude: number,
  longitude: number,
  meta?: DeepLinkMarkerMeta
): DeepLinkMarkerShape {
  const name = meta?.name?.trim();
  return {
    place_id: placeId,
    latitude,
    longitude,
    name: name || 'Location',
    address: meta?.address?.trim() || null,
    description: null,
    imageUrl: meta?.imageUrl?.trim() || null,
    category: null,
    points_value: 100,
  };
}

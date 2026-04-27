export type DeepLinkMarkerShape = {
  latitude: number;
  longitude: number;
  place_id: string;
  name: string;
  address?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  type?: string;
  points_value?: number | null;
};

/**
 * GET /api/locations omits rows without `coin_image_url`, so a saved place can exist in DB
 * but not appear in map markers. City-guide links pass `lat`/`lng`; use them so fly-to and
 * MapCard still work when the place is missing from the marker list.
 */
export function buildDeepLinkMarkerFromQueryCoords(
  placeId: string,
  latitude: number,
  longitude: number
): DeepLinkMarkerShape {
  return {
    place_id: placeId,
    latitude,
    longitude,
    name: 'Location',
    address: null,
    description: null,
    imageUrl: null,
    type: 'location',
    points_value: 100,
  };
}

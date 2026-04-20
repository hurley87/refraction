/**
 * Featured city names and their map center coordinates.
 * Used by the homepage city carousel and the interactive map for ?city= links.
 */
export const FEATURED_CITY_COORDINATES: Record<
  string,
  { lat: number; lng: number }
> = {
  Singapore: { lat: 1.3521, lng: 103.8198 },
  Denver: { lat: 39.7392, lng: -104.9903 },
  Toronto: { lat: 43.6532, lng: -79.3832 },
  Amsterdam: { lat: 52.3676, lng: 4.9041 },
  Berlin: { lat: 52.52, lng: 13.405 },
  'New York City': { lat: 40.7128, lng: -74.006 },
  'Mexico City': { lat: 19.4326, lng: -99.1332 },
};

export function getFeaturedCityCoordinates(cityName: string): {
  lat: number;
  lng: number;
} | null {
  const trimmed = cityName?.trim();
  if (!trimmed) return null;
  return FEATURED_CITY_COORDINATES[trimmed] ?? null;
}

/**
 * Resolve a city name from latitude/longitude using bounding-box proximity
 * to known city centers. Returns null when no match is found.
 *
 * The bounding boxes are intentionally generous so suburbs and boroughs
 * still resolve to the parent metro area.
 */

interface CityBounds {
  name: string;
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

const CITY_BOUNDS: CityBounds[] = [
  {
    name: 'New York City',
    latMin: 40.4,
    latMax: 41.0,
    lngMin: -74.3,
    lngMax: -73.7,
  },
  { name: 'Toronto', latMin: 43.5, latMax: 43.9, lngMin: -79.6, lngMax: -79.1 },
  {
    name: 'Denver',
    latMin: 39.5,
    latMax: 39.95,
    lngMin: -105.2,
    lngMax: -104.7,
  },
  {
    name: 'Montreal',
    latMin: 45.4,
    latMax: 45.7,
    lngMin: -73.8,
    lngMax: -73.4,
  },
  {
    name: 'Mexico City',
    latMin: 19.2,
    latMax: 19.6,
    lngMin: -99.4,
    lngMax: -98.9,
  },
  { name: 'London', latMin: 51.3, latMax: 51.7, lngMin: -0.5, lngMax: 0.3 },
  { name: 'Amsterdam', latMin: 52.2, latMax: 52.5, lngMin: 4.7, lngMax: 5.1 },
  { name: 'Miami', latMin: 25.6, latMax: 26.0, lngMin: -80.4, lngMax: -80.0 },
  { name: 'Cannes', latMin: 43.5, latMax: 43.65, lngMin: 6.9, lngMax: 7.1 },
  {
    name: 'Hong Kong',
    latMin: 22.1,
    latMax: 22.6,
    lngMin: 113.8,
    lngMax: 114.4,
  },
  { name: 'Singapore', latMin: 1.1, latMax: 1.5, lngMin: 103.5, lngMax: 104.1 },
  {
    name: 'Buenos Aires',
    latMin: -34.7,
    latMax: -34.5,
    lngMin: -58.6,
    lngMax: -58.3,
  },
  {
    name: 'Los Angeles',
    latMin: 33.7,
    latMax: 34.3,
    lngMin: -118.7,
    lngMax: -117.9,
  },
  {
    name: 'San Francisco',
    latMin: 37.6,
    latMax: 37.85,
    lngMin: -122.6,
    lngMax: -122.3,
  },
  { name: 'Paris', latMin: 48.7, latMax: 49.0, lngMin: 2.1, lngMax: 2.6 },
  { name: 'Berlin', latMin: 52.3, latMax: 52.7, lngMin: 13.1, lngMax: 13.7 },
  { name: 'Chicago', latMin: 41.6, latMax: 42.1, lngMin: -87.9, lngMax: -87.5 },
  { name: 'Austin', latMin: 30.1, latMax: 30.5, lngMin: -97.9, lngMax: -97.5 },
  { name: 'Lisbon', latMin: 38.6, latMax: 38.9, lngMin: -9.3, lngMax: -9.0 },
  { name: 'Tokyo', latMin: 35.5, latMax: 35.9, lngMin: 139.5, lngMax: 140.0 },
  { name: 'Bangkok', latMin: 13.5, latMax: 14.0, lngMin: 100.3, lngMax: 100.8 },
  {
    name: 'Boulder',
    latMin: 39.95,
    latMax: 40.15,
    lngMin: -105.4,
    lngMax: -105.1,
  },
  { name: 'Stowe', latMin: 44.4, latMax: 44.6, lngMin: -72.8, lngMax: -72.6 },
];

export function resolveCityFromCoordinates(
  lat: number,
  lng: number
): string | null {
  for (const city of CITY_BOUNDS) {
    if (
      lat >= city.latMin &&
      lat <= city.latMax &&
      lng >= city.lngMin &&
      lng <= city.lngMax
    ) {
      return city.name;
    }
  }
  return null;
}

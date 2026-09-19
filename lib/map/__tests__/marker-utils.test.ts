import { describe, it, expect } from 'vitest';
import {
  markerFromListLocation,
  haversineDistanceMeters,
  findNearestIrLMarker,
  findExistingMarker,
} from '../marker-utils';
import type { MarkerData } from '@/components/map/interactive-map-types';
import type { DrawerLocationSummary } from '@/components/location-lists-drawer';

const baseMarker = (overrides: Partial<MarkerData> = {}): MarkerData => ({
  latitude: 40.7128,
  longitude: -74.006,
  place_id: 'place-1',
  name: 'Test Spot',
  ...overrides,
});

const listLocation = (
  overrides: Partial<DrawerLocationSummary> = {}
): DrawerLocationSummary =>
  ({
    id: 1,
    place_id: 'abc',
    name: 'Cafe',
    latitude: '40.7',
    longitude: '-74.0',
    address: '1 Main St',
    description: null,
    context: null,
    coin_image_url: null,
    coin_image_thumb_url: null,
    category: null,
    event_url: null,
    points_value: 50,
    ...overrides,
  }) as DrawerLocationSummary;

describe('markerFromListLocation', () => {
  it('builds a marker from list location coords', () => {
    const result = markerFromListLocation(listLocation());

    expect(result).toMatchObject({
      place_id: 'abc',
      name: 'Cafe',
      latitude: 40.7,
      longitude: -74.0,
      points_value: 50,
    });
  });

  it('returns existing marker when provided', () => {
    const existing = baseMarker({ place_id: 'abc', name: 'Existing' });
    const result = markerFromListLocation(listLocation(), existing);
    expect(result).toBe(existing);
  });

  it('returns null without place_id or coords', () => {
    expect(markerFromListLocation(listLocation({ place_id: null }))).toBeNull();
  });
});

describe('haversineDistanceMeters', () => {
  it('returns ~0 for identical points', () => {
    expect(haversineDistanceMeters(40, -74, 40, -74)).toBeCloseTo(0, 5);
  });

  it('returns a positive distance for distinct points', () => {
    const d = haversineDistanceMeters(40.7128, -74.006, 40.758, -73.9855);
    expect(d).toBeGreaterThan(4000);
    expect(d).toBeLessThan(6000);
  });
});

describe('findNearestIrLMarker', () => {
  it('returns the closest marker within max meters', () => {
    const markers = [
      baseMarker({ place_id: 'far', latitude: 41, longitude: -74 }),
      baseMarker({
        place_id: 'near',
        latitude: 40.7129,
        longitude: -74.0061,
      }),
    ];
    expect(findNearestIrLMarker(markers, 40.7128, -74.006)?.place_id).toBe(
      'near'
    );
  });

  it('returns null when nothing is within range', () => {
    const markers = [baseMarker({ latitude: 41, longitude: -74 })];
    expect(findNearestIrLMarker(markers, 40.7128, -74.006)).toBeNull();
  });
});

describe('findExistingMarker', () => {
  it('finds by place_id', () => {
    const markers = [
      baseMarker({ place_id: 'a' }),
      baseMarker({ place_id: 'b' }),
    ];
    expect(findExistingMarker(markers, 'b')?.place_id).toBe('b');
  });

  it('returns null for missing place_id', () => {
    expect(findExistingMarker([baseMarker()], null)).toBeNull();
    expect(findExistingMarker([baseMarker()], 'missing')).toBeNull();
  });
});

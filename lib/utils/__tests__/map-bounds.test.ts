import { describe, it, expect } from 'vitest';
import {
  expandMapBoundsByKm,
  filterByMapBounds,
  getEffectiveMapBounds,
  isPointInBounds,
  lngLatBoundsFromPoints,
  parseLatLng,
} from '../map-bounds';

describe('parseLatLng', () => {
  it('parses numeric coordinates', () => {
    expect(parseLatLng(40.7, -74.0)).toEqual({
      latitude: 40.7,
      longitude: -74.0,
    });
  });

  it('parses string coordinates', () => {
    expect(parseLatLng('40.7', '-74.0')).toEqual({
      latitude: 40.7,
      longitude: -74.0,
    });
  });

  it('returns null for invalid values', () => {
    expect(parseLatLng('bad', -74)).toBeNull();
  });
});

describe('isPointInBounds', () => {
  const bounds = { north: 41, south: 40, east: -73, west: -75 };

  it('returns true for a point inside bounds', () => {
    expect(isPointInBounds({ latitude: 40.5, longitude: -74 }, bounds)).toBe(
      true
    );
  });

  it('returns false for a point outside latitude', () => {
    expect(isPointInBounds({ latitude: 42, longitude: -74 }, bounds)).toBe(
      false
    );
  });
});

describe('expandMapBoundsByKm', () => {
  it('expands bounds in all directions', () => {
    const bounds = { north: 41, south: 40, east: -73, west: -75 };
    const expanded = expandMapBoundsByKm(bounds, 25);
    expect(expanded.north).toBeGreaterThan(bounds.north);
    expect(expanded.south).toBeLessThan(bounds.south);
    expect(expanded.east).toBeGreaterThan(bounds.east);
    expect(expanded.west).toBeLessThan(bounds.west);
  });
});

describe('filterByMapBounds', () => {
  const items = [
    { place_id: 'a', latitude: 40.5, longitude: -74 },
    { place_id: 'b', latitude: 50, longitude: -74 },
  ];
  const bounds = { north: 41, south: 40, east: -73, west: -75 };

  it('filters to items within effective bounds', () => {
    const filtered = filterByMapBounds(items, bounds);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].place_id).toBe('a');
  });

  it('always includes forced place_ids', () => {
    const filtered = filterByMapBounds(items, bounds, {
      alwaysIncludePlaceIds: ['b'],
    });
    expect(filtered.map((i) => i.place_id).sort()).toEqual(['a', 'b']);
  });

  it('returns all items when bounds are null', () => {
    expect(filterByMapBounds(items, null)).toEqual(items);
  });
});

describe('lngLatBoundsFromPoints', () => {
  it('returns null for an empty list', () => {
    expect(lngLatBoundsFromPoints([])).toBeNull();
  });

  it('covers all points as southwest / northeast corners', () => {
    expect(
      lngLatBoundsFromPoints([
        { latitude: 40, longitude: -74 },
        { latitude: 41, longitude: -73 },
      ])
    ).toEqual([
      [-74, 40],
      [-73, 41],
    ]);
  });

  it('pads a single point so fitBounds has a box', () => {
    const bounds = lngLatBoundsFromPoints([{ latitude: 40, longitude: -74 }]);
    expect(bounds).not.toBeNull();
    const [[west, south], [east, north]] = bounds!;
    expect(west).toBeLessThan(-74);
    expect(east).toBeGreaterThan(-74);
    expect(south).toBeLessThan(40);
    expect(north).toBeGreaterThan(40);
  });
});

describe('getEffectiveMapBounds', () => {
  it('returns null when map bounds are missing', () => {
    expect(getEffectiveMapBounds(null)).toBeNull();
  });
});

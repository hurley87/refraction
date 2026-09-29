import { describe, expect, it } from 'vitest';

import {
  coerceToArray,
  listLocationsCount,
} from '@/lib/location-lists/list-locations-count';

describe('coerceToArray', () => {
  it('returns arrays unchanged', () => {
    const input = [{ id: 1 }];
    expect(coerceToArray(input)).toBe(input);
  });

  it('returns [] for non-array values (JAVASCRIPT-NEXTJS-25)', () => {
    expect(coerceToArray(null)).toEqual([]);
    expect(coerceToArray(undefined)).toEqual([]);
    expect(coerceToArray({ length: 2 })).toEqual([]);
    expect(coerceToArray('not-an-array')).toEqual([]);
  });
});

describe('listLocationsCount', () => {
  it('returns 0 for null or undefined locations (JAVASCRIPT-NEXTJS-1W)', () => {
    expect(listLocationsCount(null)).toBe(0);
    expect(listLocationsCount(undefined)).toBe(0);
  });

  it('returns 0 for non-array truthy values with length (JAVASCRIPT-NEXTJS-25)', () => {
    expect(listLocationsCount('ab')).toBe(0);
    expect(listLocationsCount({ length: 3 })).toBe(0);
  });

  it('returns array length when locations is present', () => {
    expect(listLocationsCount([])).toBe(0);
    expect(listLocationsCount([{ id: 1 }, { id: 2 }])).toBe(2);
  });
});

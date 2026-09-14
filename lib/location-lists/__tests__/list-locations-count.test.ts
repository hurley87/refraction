import { describe, expect, it } from 'vitest';

import { listLocationsCount } from '@/lib/location-lists/list-locations-count';

describe('listLocationsCount', () => {
  it('returns 0 for null or undefined locations (JAVASCRIPT-NEXTJS-1W)', () => {
    expect(listLocationsCount(null)).toBe(0);
    expect(listLocationsCount(undefined)).toBe(0);
  });

  it('returns array length when locations is present', () => {
    expect(listLocationsCount([])).toBe(0);
    expect(listLocationsCount([{ id: 1 }, { id: 2 }])).toBe(2);
  });
});

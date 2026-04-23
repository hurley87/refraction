import { describe, it, expect } from 'vitest';
import { buildDeepLinkMarkerFromQueryCoords } from '../map-deep-link-marker';

describe('buildDeepLinkMarkerFromQueryCoords', () => {
  it('builds a marker with the given place id and coordinates', () => {
    const m = buildDeepLinkMarkerFromQueryCoords('place-abc', 52.5, 13.4);
    expect(m.place_id).toBe('place-abc');
    expect(m.latitude).toBe(52.5);
    expect(m.longitude).toBe(13.4);
    expect(m.name).toBe('Location');
    expect(m.imageUrl).toBeNull();
    expect(m.type).toBe('location');
  });
});

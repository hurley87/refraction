import { describe, it, expect } from 'vitest';
import {
  haversineKm,
  parseInteractiveMapCoordsFromUrl,
} from '../checkpoint-map-link';

describe('checkpoint-map-link', () => {
  describe('haversineKm', () => {
    it('returns ~0 for identical points', () => {
      expect(haversineKm(40.7, -73.9, 40.7, -73.9)).toBeLessThan(0.001);
    });

    it('returns plausible distance for NYC to nearby point', () => {
      const km = haversineKm(40.7081, -73.9442, 40.758, -73.9855);
      expect(km).toBeGreaterThan(5);
      expect(km).toBeLessThan(15);
    });
  });

  describe('parseInteractiveMapCoordsFromUrl', () => {
    it('parses absolute interactive-map URL with lat lng', () => {
      const coords = parseInteractiveMapCoordsFromUrl(
        'https://app.example/interactive-map?lat=40.7&lng=-73.9'
      );
      expect(coords).toEqual({ lat: 40.7, lng: -73.9 });
    });

    it('returns null for non-map paths', () => {
      expect(
        parseInteractiveMapCoordsFromUrl('https://x.com/interactive-map')
      ).toBeNull();
    });

    it('returns null when lat lng missing', () => {
      expect(
        parseInteractiveMapCoordsFromUrl('https://app.example/interactive-map')
      ).toBeNull();
    });
  });
});

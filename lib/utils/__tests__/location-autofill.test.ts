import { describe, it, expect } from 'vitest';
import { deriveDisplayNameAndAddress } from '../location-autofill';

describe('deriveDisplayNameAndAddress', () => {
  describe('POI (Point of Interest)', () => {
    it('should set displayName to POI name and address to placeFormatted (with POI name prefix stripped)', () => {
      const result = deriveDisplayNameAndAddress({
        name: 'Club El Desconocido',
        placeFormatted:
          'Club El Desconocido, Coahuila 92, Roma Nte., Cuauhtémoc, 06700 Ciudad de México, CDMX, Mexico',
        featureType: 'poi',
      });

      expect(result.displayName).toBe('Club El Desconocido');
      expect(result.address).toBe(
        'Coahuila 92, Roma Nte., Cuauhtémoc, 06700 Ciudad de México, CDMX, Mexico'
      );
    });

    it('should handle POI when placeFormatted does not start with name', () => {
      const result = deriveDisplayNameAndAddress({
        name: 'Coffee Shop',
        placeFormatted: '123 Main St, New York, NY',
        featureType: 'poi',
      });

      expect(result.displayName).toBe('Coffee Shop');
      expect(result.address).toBe('123 Main St, New York, NY');
    });

    it('should fallback to placeFormatted if address becomes empty after stripping', () => {
      const result = deriveDisplayNameAndAddress({
        name: 'Test POI',
        placeFormatted: 'Test POI',
        featureType: 'poi',
      });

      expect(result.displayName).toBe('Test POI');
      expect(result.address).toBe('Test POI');
    });

    it('should handle POI with missing name', () => {
      const result = deriveDisplayNameAndAddress({
        name: undefined,
        placeFormatted: 'Some Address',
        featureType: 'poi',
      });

      expect(result.displayName).toBe('');
      expect(result.address).toBe('Some Address');
    });
  });

  describe('Address-like or unknown feature types', () => {
    it('should leave displayName empty and set address to placeFormatted for address type', () => {
      const result = deriveDisplayNameAndAddress({
        name: 'Coahuila 92',
        placeFormatted:
          'Coahuila 92, Roma Nte., Cuauhtémoc, 06700 Ciudad de México, CDMX, Mexico',
        featureType: 'address',
      });

      expect(result.displayName).toBe('');
      expect(result.address).toBe(
        'Coahuila 92, Roma Nte., Cuauhtémoc, 06700 Ciudad de México, CDMX, Mexico'
      );
    });

    it('should leave displayName empty and set address to placeFormatted for place type', () => {
      const result = deriveDisplayNameAndAddress({
        name: 'New York',
        placeFormatted: 'New York, NY, USA',
        featureType: 'place',
      });

      expect(result.displayName).toBe('');
      expect(result.address).toBe('New York, NY, USA');
    });

    it('should fallback to name if placeFormatted is missing', () => {
      const result = deriveDisplayNameAndAddress({
        name: 'Some Location',
        placeFormatted: undefined,
        featureType: 'address',
      });

      expect(result.displayName).toBe('');
      expect(result.address).toBe('Some Location');
    });

    it('should handle unknown feature type (treat as address)', () => {
      const result = deriveDisplayNameAndAddress({
        name: 'Unknown Place',
        placeFormatted: 'Some Address',
        featureType: undefined,
      });

      expect(result.displayName).toBe('');
      expect(result.address).toBe('Some Address');
    });

    it('should handle empty strings gracefully', () => {
      const result = deriveDisplayNameAndAddress({
        name: '',
        placeFormatted: '',
        featureType: 'address',
      });

      expect(result.displayName).toBe('');
      expect(result.address).toBe('');
    });
  });

  describe('Edge cases', () => {
    it('should handle POI name with comma in placeFormatted prefix', () => {
      const result = deriveDisplayNameAndAddress({
        name: 'Starbucks',
        placeFormatted: 'Starbucks, 123 Main St, New York, NY',
        featureType: 'poi',
      });

      expect(result.displayName).toBe('Starbucks');
      expect(result.address).toBe('123 Main St, New York, NY');
    });

    it('should not strip if name does not match prefix exactly', () => {
      const result = deriveDisplayNameAndAddress({
        name: 'Coffee',
        placeFormatted: 'Coffee Shop, 123 Main St',
        featureType: 'poi',
      });

      expect(result.displayName).toBe('Coffee');
      expect(result.address).toBe('Coffee Shop, 123 Main St');
    });

    it('should handle case sensitivity in prefix matching', () => {
      const result = deriveDisplayNameAndAddress({
        name: 'Coffee',
        placeFormatted: 'coffee, 123 Main St',
        featureType: 'poi',
      });

      expect(result.displayName).toBe('Coffee');
      expect(result.address).toBe('coffee, 123 Main St'); // Case-sensitive, so not stripped
    });
  });
});

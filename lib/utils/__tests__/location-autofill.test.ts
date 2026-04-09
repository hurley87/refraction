import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MAX_POI_NAME_DISTANCE_M,
  deriveDisplayNameAndAddress,
  mergePoiAndAddressReverseGeocode,
  mergeSearchBoxReverseFeatures,
  type SearchBoxReverseFeature,
} from '../location-autofill';

describe('mergeSearchBoxReverseFeatures', () => {
  it('prefers POI name and address feature full_address when both exist', () => {
    const result = mergeSearchBoxReverseFeatures([
      {
        properties: {
          feature_type: 'poi',
          name: 'Blue Bottle Coffee',
          mapbox_id: 'poi-id',
          full_address: '66 Mint St, San Francisco, CA 94103, United States',
        },
      },
      {
        properties: {
          feature_type: 'address',
          full_address: '66 Mint St, San Francisco, CA 94103, United States',
          mapbox_id: 'addr-id',
        },
      },
    ]);

    expect(result?.name).toBe('Blue Bottle Coffee');
    expect(result?.address).toBe(
      '66 Mint St, San Francisco, CA 94103, United States'
    );
    expect(result?.mapboxId).toBe('poi-id');
  });

  it('returns null for empty features', () => {
    expect(mergeSearchBoxReverseFeatures(undefined)).toBeNull();
    expect(mergeSearchBoxReverseFeatures([])).toBeNull();
  });

  it('does not use a neighboring POI name when click is closer to the address feature', () => {
    const lat = 37.7749;
    const lng = -122.4194;
    const click = { latitude: lat, longitude: lng };
    // ~22 m north of click — within max POI distance but farther than the address pin
    const offsetLat = lat + 22 / 111_320;
    const poi: SearchBoxReverseFeature = {
      geometry: { coordinates: [lng, offsetLat] },
      properties: {
        feature_type: 'poi',
        name: 'Next Door Cafe',
        mapbox_id: 'poi-1',
        full_address: '102 Example St, San Francisco, CA',
      },
    };
    const addr: SearchBoxReverseFeature = {
      geometry: { coordinates: [lng, lat] },
      properties: {
        feature_type: 'address',
        full_address: '100 Example St, San Francisco, CA',
        mapbox_id: 'addr-1',
      },
    };

    const result = mergeSearchBoxReverseFeatures([poi, addr], { click });

    expect(result?.name).toBe('100 Example St, San Francisco, CA');
    expect(result?.mapboxId).toBe('addr-1');
  });

  it('uses POI name when click is near the POI and comparable to address distance', () => {
    const lat = 37.7749;
    const lng = -122.4194;
    const click = { latitude: lat, longitude: lng };
    const shared: SearchBoxReverseFeature = {
      geometry: { coordinates: [lng, lat] },
      properties: {
        feature_type: 'poi',
        name: 'Same Spot Coffee',
        mapbox_id: 'poi-2',
        full_address: '100 Example St, San Francisco, CA',
      },
    };
    const addr: SearchBoxReverseFeature = {
      geometry: { coordinates: [lng, lat] },
      properties: {
        feature_type: 'address',
        full_address: '100 Example St, San Francisco, CA',
        mapbox_id: 'addr-2',
      },
    };

    const result = mergeSearchBoxReverseFeatures([shared, addr], { click });

    expect(result?.name).toBe('Same Spot Coffee');
  });

  it('rejects POI name when POI is beyond max distance from click', () => {
    const lat = 37.7749;
    const lng = -122.4194;
    const click = { latitude: lat, longitude: lng };
    const offsetLat = lat + (DEFAULT_MAX_POI_NAME_DISTANCE_M + 15) / 111_320;
    const poi: SearchBoxReverseFeature = {
      geometry: { coordinates: [lng, offsetLat] },
      properties: {
        feature_type: 'poi',
        name: 'Far Cafe',
        mapbox_id: 'poi-3',
        full_address: '500 Example St, San Francisco, CA',
      },
    };
    const addr: SearchBoxReverseFeature = {
      geometry: { coordinates: [lng, lat] },
      properties: {
        feature_type: 'address',
        full_address: '100 Example St, San Francisco, CA',
        mapbox_id: 'addr-3',
      },
    };

    const result = mergeSearchBoxReverseFeatures([poi, addr], { click });

    expect(result?.name).toBe('100 Example St, San Francisco, CA');
  });
});

describe('mergePoiAndAddressReverseGeocode', () => {
  it('uses POI name and address lookup street line when both exist', () => {
    const result = mergePoiAndAddressReverseGeocode(
      {
        id: 'poi.1',
        text: 'Blue Bottle Coffee',
        place_name:
          'Blue Bottle Coffee, 66 Mint St, San Francisco, CA 94103, United States',
        place_type: ['poi'],
      },
      {
        id: 'address.1',
        text: '66 Mint St',
        place_name: '66 Mint St, San Francisco, CA 94103, United States',
        place_type: ['address'],
      }
    );

    expect(result.name).toBe('Blue Bottle Coffee');
    expect(result.address).toBe(
      '66 Mint St, San Francisco, CA 94103, United States'
    );
  });

  it('falls back to stripped place_name when address lookup is missing', () => {
    const result = mergePoiAndAddressReverseGeocode(
      {
        text: 'Cafe Roma',
        place_name: 'Cafe Roma, 100 Main St, New York, NY, USA',
        place_type: ['poi'],
      },
      undefined
    );

    expect(result.name).toBe('Cafe Roma');
    expect(result.address).toBe('100 Main St, New York, NY, USA');
  });

  it('uses address only when no POI', () => {
    const result = mergePoiAndAddressReverseGeocode(undefined, {
      place_name: '200 Oak Ave, Austin, TX, USA',
      place_type: ['address'],
    });

    expect(result.name).toBe('200 Oak Ave, Austin, TX, USA');
    expect(result.address).toBe('200 Oak Ave, Austin, TX, USA');
  });

  it('ignores distant POI when spatial options are passed (geocoding v5 features)', () => {
    const lat = 30.2672;
    const lng = -97.7431;
    const click = { latitude: lat, longitude: lng };
    const offsetLat = lat + 40 / 111_320;
    const result = mergePoiAndAddressReverseGeocode(
      {
        text: 'Nearby Shop',
        place_name: 'Nearby Shop, 1 St, Austin, TX',
        place_type: ['poi'],
        geometry: { coordinates: [lng, offsetLat] },
      },
      {
        place_name: '100 Oak Ave, Austin, TX, USA',
        place_type: ['address'],
        geometry: { coordinates: [lng, lat] },
      },
      { click }
    );

    expect(result.name).toBe('100 Oak Ave, Austin, TX, USA');
  });

  it('returns Unknown Location when both are missing', () => {
    const result = mergePoiAndAddressReverseGeocode(undefined, undefined);
    expect(result.name).toBe('Unknown Location');
    expect(result.address).toBe('Unknown Location');
  });
});

describe('deriveDisplayNameAndAddress', () => {
  describe('POI (Point of Interest)', () => {
    it('should recognize poi feature type case-insensitively', () => {
      const result = deriveDisplayNameAndAddress({
        name: 'Test Venue',
        placeFormatted: 'Test Venue, 1 Main St, City',
        featureType: 'POI',
      });

      expect(result.displayName).toBe('Test Venue');
      expect(result.address).toBe('1 Main St, City');
    });

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
    it('should split Name, Address only when feature_type is unknown (ambiguous suggest)', () => {
      const result = deriveDisplayNameAndAddress({
        name: 'Blue Bottle',
        placeFormatted: 'Blue Bottle, 66 Mint St, San Francisco, CA',
        featureType: undefined,
      });

      expect(result.displayName).toBe('Blue Bottle');
      expect(result.address).toBe('66 Mint St, San Francisco, CA');
    });

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

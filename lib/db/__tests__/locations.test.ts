import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Location, LocationOption } from '@/lib/types';

// Mock the supabase client - use any for complex mock chains
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFrom = vi.fn((): any => ({}));
const mockRpc = vi.fn();

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import {
  createOrGetLocation,
  deleteLocationById,
  getCityMetrics,
  listAllLocations,
  listLocationsByWallet,
  listLocationOptions,
} from '../locations';

describe('Locations Database Module', () => {
  // Sample location data for tests
  const sampleLocation: Location = {
    id: 1,
    name: 'Test Venue',
    latitude: 40.7128,
    longitude: -74.006,
    place_id: 'test-place-123',
    points_value: 100,
    type: 'venue',
    created_at: '2024-01-01T00:00:00Z',
  };

  const sampleLocationOption: LocationOption = {
    id: 1,
    name: 'Test Venue',
    latitude: 40.7128,
    longitude: -74.006,
    place_id: 'test-place-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrGetLocation', () => {
    it('should return existing location if place_id exists', async () => {
      const mockSelectChain = {
        eq: vi.fn(() => ({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: sampleLocation, error: null }),
        })),
      };
      mockFrom.mockReturnValue({
        select: vi.fn(() => mockSelectChain),
      });

      const locationData = {
        name: 'Test Venue',
        latitude: 40.7128,
        longitude: -74.006,
        place_id: 'test-place-123',
        points_value: 100,
      };

      const result = await createOrGetLocation(locationData);

      expect(result).toEqual(sampleLocation);
      expect(mockFrom).toHaveBeenCalledWith('locations');
    });

    it('should throw when lookup fails with a real database error', async () => {
      const mockSelectChain = {
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST500', message: 'Lookup failed' },
          }),
        })),
      };
      mockFrom.mockReturnValue({
        select: vi.fn(() => mockSelectChain),
      });

      const locationData = {
        name: 'Test Venue',
        latitude: 40.7128,
        longitude: -74.006,
        place_id: 'test-place-123',
        points_value: 100,
      };

      await expect(createOrGetLocation(locationData)).rejects.toEqual({
        code: 'PGRST500',
        message: 'Lookup failed',
      });
    });

    it('should create new location if place_id does not exist', async () => {
      const newLocation = { ...sampleLocation, id: 2 };

      // First call for select - returns no existing location
      const mockSelectFirst = {
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      };
      // Second call for upsert
      const mockUpsertChain = {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: newLocation, error: null }),
        })),
      };

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: vi.fn(() => mockSelectFirst) };
        }
        return {
          upsert: vi.fn(() => mockUpsertChain),
        };
      });

      const locationData = {
        name: 'Test Venue',
        latitude: 40.7128,
        longitude: -74.006,
        place_id: 'new-place-456',
        points_value: 100,
      };

      const result = await createOrGetLocation(locationData);

      expect(result).toEqual(newLocation);
    });

    it('should throw error on insert failure', async () => {
      // First call returns no existing
      const mockSelectFirst = {
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      };
      // Second call (upsert) fails
      const mockUpsertChain = {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST500', message: 'Insert failed' },
          }),
        })),
      };

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: vi.fn(() => mockSelectFirst) };
        }
        return {
          upsert: vi.fn(() => mockUpsertChain),
        };
      });

      const locationData = {
        name: 'Test Venue',
        latitude: 40.7128,
        longitude: -74.006,
        place_id: 'fail-place',
        points_value: 100,
      };

      await expect(createOrGetLocation(locationData)).rejects.toEqual({
        code: 'PGRST500',
        message: 'Insert failed',
      });
    });
  });

  describe('deleteLocationById', () => {
    it('should return true when a row is deleted', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: { id: 1 }, error: null }),
            })),
          })),
        })),
      });

      const result = await deleteLocationById(1);

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('locations');
    });

    it('should return false when no row matches', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
      });

      const result = await deleteLocationById(999);

      expect(result).toBe(false);
    });

    it('should throw on delete error', async () => {
      const dbError = { code: 'PGRST500', message: 'Delete failed' };
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: null, error: dbError }),
            })),
          })),
        })),
      });

      await expect(deleteLocationById(1)).rejects.toEqual(dbError);
    });
  });

  describe('listAllLocations', () => {
    it('should return locations ordered by created_at descending', async () => {
      const locations = [
        sampleLocation,
        { ...sampleLocation, id: 2, name: 'Venue 2' },
      ];

      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: locations, error: null }),
        })),
      });

      const result = await listAllLocations();

      expect(result).toEqual(locations);
      expect(mockFrom).toHaveBeenCalledWith('locations');
    });

    it('should return empty array when no locations exist', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      });

      const result = await listAllLocations();

      expect(result).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST500', message: 'Database error' },
          }),
        })),
      });

      await expect(listAllLocations()).rejects.toEqual({
        code: 'PGRST500',
        message: 'Database error',
      });
    });
  });

  describe('listLocationsByWallet', () => {
    it('should return locations for player with wallet', async () => {
      const locationsFromCheckins = [
        { locations: sampleLocation },
        { locations: { ...sampleLocation, id: 2 } },
      ];

      mockFrom.mockImplementation((table) => {
        if (table === 'players') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: { id: 1 }, error: null }),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi
              .fn()
              .mockResolvedValue({ data: locationsFromCheckins, error: null }),
          })),
        };
      });

      const result = await listLocationsByWallet(
        '0x1234567890abcdef1234567890abcdef12345678'
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(sampleLocation);
    });

    it('should return empty array when player not found', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'Not found' },
            }),
          })),
        })),
      });

      const result = await listLocationsByWallet('0xnonexistent');

      expect(result).toEqual([]);
    });

    it('should filter out null locations', async () => {
      const locationsFromCheckins = [
        { locations: sampleLocation },
        { locations: null },
        { locations: { ...sampleLocation, id: 3 } },
      ];

      mockFrom.mockImplementation((table) => {
        if (table === 'players') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: { id: 1 }, error: null }),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi
              .fn()
              .mockResolvedValue({ data: locationsFromCheckins, error: null }),
          })),
        };
      });

      const result = await listLocationsByWallet(
        '0x1234567890abcdef1234567890abcdef12345678'
      );

      expect(result).toHaveLength(2);
    });

    it('should throw error on checkins query failure', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'players') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: { id: 1 }, error: null }),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST500', message: 'Query failed' },
            }),
          })),
        };
      });

      await expect(
        listLocationsByWallet('0x1234567890abcdef1234567890abcdef12345678')
      ).rejects.toEqual({
        code: 'PGRST500',
        message: 'Query failed',
      });
    });
  });

  describe('listLocationOptions', () => {
    it('should return location options without search filter', async () => {
      const options = [
        sampleLocationOption,
        { ...sampleLocationOption, id: 2 },
      ];

      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: options, error: null }),
          })),
        })),
      });

      const result = await listLocationOptions();

      expect(result).toEqual(options);
      expect(mockFrom).toHaveBeenCalledWith('locations');
    });

    it('should apply search filter with ilike', async () => {
      const filteredOptions = [sampleLocationOption];

      const mockIlikeFn = vi
        .fn()
        .mockResolvedValue({ data: filteredOptions, error: null });

      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              ilike: mockIlikeFn,
            })),
          })),
        })),
      });

      const result = await listLocationOptions('Test');

      expect(result).toEqual(filteredOptions);
      expect(mockIlikeFn).toHaveBeenCalledWith('name', '%Test%');
    });

    it('should sanitize special characters in search (% and _)', async () => {
      const mockIlikeFn = vi.fn().mockResolvedValue({ data: [], error: null });

      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              ilike: mockIlikeFn,
            })),
          })),
        })),
      });

      await listLocationOptions('test%_special');

      // % and _ should be escaped to prevent SQL injection
      expect(mockIlikeFn).toHaveBeenCalledWith('name', '%test\\%\\_special%');
    });

    it('should trim whitespace from search term', async () => {
      const mockIlikeFn = vi.fn().mockResolvedValue({ data: [], error: null });

      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              ilike: mockIlikeFn,
            })),
          })),
        })),
      });

      await listLocationOptions('  test  ');

      expect(mockIlikeFn).toHaveBeenCalledWith('name', '%test%');
    });

    it('should not apply filter for empty search string', async () => {
      const options = [sampleLocationOption];

      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: options, error: null }),
          })),
        })),
      });

      const result = await listLocationOptions('');

      expect(result).toEqual(options);
    });

    it('should not apply filter for whitespace-only search', async () => {
      const options = [sampleLocationOption];

      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: options, error: null }),
          })),
        })),
      });

      const result = await listLocationOptions('   ');

      expect(result).toEqual(options);
    });

    it('should respect custom limit parameter', async () => {
      const mockLimitFn = vi.fn().mockResolvedValue({ data: [], error: null });

      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: mockLimitFn,
          })),
        })),
      });

      await listLocationOptions(undefined, 50);

      expect(mockLimitFn).toHaveBeenCalledWith(50);
    });

    it('should use default limit of 250', async () => {
      const mockLimitFn = vi.fn().mockResolvedValue({ data: [], error: null });

      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: mockLimitFn,
          })),
        })),
      });

      await listLocationOptions();

      expect(mockLimitFn).toHaveBeenCalledWith(250);
    });

    it('should return empty array when data is null', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      });

      const result = await listLocationOptions();

      expect(result).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST500', message: 'Database error' },
            }),
          })),
        })),
      });

      await expect(listLocationOptions()).rejects.toEqual({
        code: 'PGRST500',
        message: 'Database error',
      });
    });
  });

  describe('getCityMetrics', () => {
    it('should return metrics from RPC when function exists', async () => {
      const rpcMetrics = [
        {
          city: 'New York City',
          total_spots: 10,
          visible_spots: 8,
          latest_spot_at: '2026-04-01T00:00:00Z',
        },
      ];

      mockRpc.mockResolvedValue({ data: rpcMetrics, error: null });

      const result = await getCityMetrics();

      expect(result).toEqual(rpcMetrics);
      expect(mockRpc).toHaveBeenCalledWith('get_city_metrics');
    });

    it('should fallback to locations aggregation when RPC is missing', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST202',
          message: 'Could not find function public.get_city_metrics',
        },
      });
      mockFrom.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            {
              city: 'New York City',
              is_visible: true,
              created_at: '2026-04-01T00:00:00Z',
            },
            {
              city: 'New York City',
              is_visible: false,
              created_at: '2026-04-02T00:00:00Z',
            },
            {
              city: null,
              is_visible: true,
              created_at: '2026-04-03T00:00:00Z',
            },
          ],
          error: null,
        }),
      });

      const result = await getCityMetrics();

      expect(mockFrom).toHaveBeenCalledWith('locations');
      expect(result).toEqual([
        {
          city: 'New York City',
          total_spots: 2,
          visible_spots: 1,
          latest_spot_at: '2026-04-02T00:00:00Z',
        },
        {
          city: 'Unknown',
          total_spots: 1,
          visible_spots: 1,
          latest_spot_at: '2026-04-03T00:00:00Z',
        },
      ]);
    });

    it('should throw RPC errors unrelated to missing function', async () => {
      const rpcError = { code: '42501', message: 'permission denied' };
      mockRpc.mockResolvedValue({ data: null, error: rpcError });

      await expect(getCityMetrics()).rejects.toEqual(rpcError);
    });
  });
});

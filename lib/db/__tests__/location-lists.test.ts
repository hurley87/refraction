import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase client - use any for complex mock chains
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockRpc = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFrom = vi.fn((): any => ({}));

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import {
  getLocationLists,
  createLocationList,
  updateLocationList,
  deleteLocationList,
  getLocationsForList,
  addLocationToList,
  removeLocationFromList,
} from '../location-lists';

describe('Location Lists Database Module', () => {
  const sampleList = {
    id: 'list-1',
    title: 'Test List',
    slug: 'test-list',
    description: 'A test location list',
    accent_color: '#FF0000',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const sampleLocation = {
    id: 1,
    name: 'Test Venue',
    address: '123 Main St',
    description: 'A test venue',
    latitude: 40.7128,
    longitude: -74.006,
    place_id: 'test-place-123',
    points_value: 100,
    type: 'venue',
    event_url: null,
    context: null,
    coin_address: null,
    coin_symbol: null,
    coin_name: null,
    coin_image_url: null,
    creator_wallet_address: null,
    creator_username: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLocationLists', () => {
    it('should return lists from RPC when available', async () => {
      const rpcData = [
        { ...sampleList, location_count: 5 },
        { ...sampleList, id: 'list-2', title: 'Second List', location_count: 3 },
      ];

      mockRpc.mockResolvedValueOnce({ data: rpcData, error: null });

      const result = await getLocationLists();

      expect(result).toEqual(rpcData);
      expect(mockRpc).toHaveBeenCalledWith('get_location_lists_with_counts');
    });

    it('should fall back to two-query approach when RPC fails', async () => {
      const lists = [sampleList, { ...sampleList, id: 'list-2', title: 'Second List' }];
      const memberships = [
        { list_id: 'list-1' },
        { list_id: 'list-1' },
        { list_id: 'list-2' },
      ];

      // RPC fails
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'function does not exist' },
      });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First fallback call: get lists
          return {
            select: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: lists, error: null }),
            })),
          };
        }
        // Second fallback call: get memberships
        return {
          select: vi.fn().mockResolvedValue({ data: memberships, error: null }),
        };
      });

      const result = await getLocationLists();

      expect(result).toHaveLength(2);
      expect(result[0].location_count).toBe(2);
      expect(result[1].location_count).toBe(1);
    });

    it('should return empty array when no lists exist (fallback)', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC failed' },
      });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          };
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      });

      const result = await getLocationLists();

      expect(result).toEqual([]);
    });

    it('should throw error when fallback lists query fails', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC failed' },
      });

      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST500', message: 'Database error' },
          }),
        })),
      });

      await expect(getLocationLists()).rejects.toEqual({
        code: 'PGRST500',
        message: 'Database error',
      });
    });

    it('should throw error when fallback memberships query fails', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC failed' },
      });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: [sampleList], error: null }),
            })),
          };
        }
        return {
          select: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST500', message: 'Memberships error' },
          }),
        };
      });

      await expect(getLocationLists()).rejects.toEqual({
        code: 'PGRST500',
        message: 'Memberships error',
      });
    });
  });

  describe('createLocationList', () => {
    it('should create a new location list', async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: sampleList, error: null }),
          })),
        })),
      });

      const result = await createLocationList({
        title: 'Test List',
        slug: 'test-list',
        description: 'A test location list',
        accent_color: '#FF0000',
      });

      expect(result).toEqual(sampleList);
      expect(mockFrom).toHaveBeenCalledWith('location_lists');
    });

    it('should create list with default is_active when not provided', async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: sampleList, error: null }),
          })),
        })),
      });

      const result = await createLocationList({
        title: 'Test List',
        slug: 'test-list',
      });

      expect(result).toEqual(sampleList);
    });

    it('should throw error on insert failure', async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'Duplicate slug' },
            }),
          })),
        })),
      });

      await expect(
        createLocationList({ title: 'Test', slug: 'duplicate-slug' })
      ).rejects.toEqual({ code: '23505', message: 'Duplicate slug' });
    });
  });

  describe('updateLocationList', () => {
    it('should update an existing location list', async () => {
      const updatedList = { ...sampleList, title: 'Updated Title' };

      mockFrom.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: updatedList, error: null }),
            })),
          })),
        })),
      });

      const result = await updateLocationList('list-1', { title: 'Updated Title' });

      expect(result).toEqual(updatedList);
      expect(result.title).toBe('Updated Title');
      expect(mockFrom).toHaveBeenCalledWith('location_lists');
    });

    it('should throw error on update failure', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST500', message: 'Update failed' },
              }),
            })),
          })),
        })),
      });

      await expect(
        updateLocationList('list-1', { title: 'Updated' })
      ).rejects.toEqual({ code: 'PGRST500', message: 'Update failed' });
    });
  });

  describe('deleteLocationList', () => {
    it('should delete a location list', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      await expect(deleteLocationList('list-1')).resolves.toBeUndefined();
      expect(mockFrom).toHaveBeenCalledWith('location_lists');
    });

    it('should throw error on delete failure', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: { code: 'PGRST500', message: 'Delete failed' },
          }),
        })),
      });

      await expect(deleteLocationList('list-1')).rejects.toEqual({
        code: 'PGRST500',
        message: 'Delete failed',
      });
    });
  });

  describe('getLocationsForList', () => {
    it('should return locations for a given list', async () => {
      const membershipData = [
        {
          id: 'member-1',
          list_id: 'list-1',
          location_id: 1,
          created_at: '2024-01-01T00:00:00Z',
          locations: sampleLocation,
        },
      ];

      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: membershipData, error: null }),
          })),
        })),
      });

      const result = await getLocationsForList('list-1');

      expect(result).toHaveLength(1);
      expect(result[0].membership_id).toBe('member-1');
      expect(result[0].location).toEqual(sampleLocation);
      expect(mockFrom).toHaveBeenCalledWith('location_list_members');
    });

    it('should filter out rows with null locations', async () => {
      const membershipData = [
        {
          id: 'member-1',
          list_id: 'list-1',
          location_id: 1,
          created_at: '2024-01-01T00:00:00Z',
          locations: sampleLocation,
        },
        {
          id: 'member-2',
          list_id: 'list-1',
          location_id: 2,
          created_at: '2024-01-02T00:00:00Z',
          locations: null,
        },
      ];

      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: membershipData, error: null }),
          })),
        })),
      });

      const result = await getLocationsForList('list-1');

      expect(result).toHaveLength(1);
      expect(result[0].membership_id).toBe('member-1');
    });

    it('should handle array nested relations from Supabase', async () => {
      const membershipData = [
        {
          id: 'member-1',
          list_id: 'list-1',
          location_id: 1,
          created_at: '2024-01-01T00:00:00Z',
          locations: [sampleLocation],
        },
      ];

      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: membershipData, error: null }),
          })),
        })),
      });

      const result = await getLocationsForList('list-1');

      expect(result).toHaveLength(1);
      expect(result[0].location).toEqual(sampleLocation);
    });

    it('should return empty array when no locations in list', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      });

      const result = await getLocationsForList('list-1');

      expect(result).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST500', message: 'Query failed' },
            }),
          })),
        })),
      });

      await expect(getLocationsForList('list-1')).rejects.toEqual({
        code: 'PGRST500',
        message: 'Query failed',
      });
    });
  });

  describe('addLocationToList', () => {
    it('should add a location to a list and return membership', async () => {
      const insertedData = {
        id: 'member-1',
        list_id: 'list-1',
        location_id: 1,
        created_at: '2024-01-01T00:00:00Z',
        locations: sampleLocation,
      };

      mockFrom.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: insertedData, error: null }),
          })),
        })),
      });

      const result = await addLocationToList('list-1', 1);

      expect(result.membership_id).toBe('member-1');
      expect(result.list_id).toBe('list-1');
      expect(result.location_id).toBe(1);
      expect(result.location).toEqual(sampleLocation);
      expect(mockFrom).toHaveBeenCalledWith('location_list_members');
    });

    it('should handle array nested locations from Supabase', async () => {
      const insertedData = {
        id: 'member-1',
        list_id: 'list-1',
        location_id: 1,
        created_at: '2024-01-01T00:00:00Z',
        locations: [sampleLocation],
      };

      mockFrom.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: insertedData, error: null }),
          })),
        })),
      });

      const result = await addLocationToList('list-1', 1);

      expect(result.location).toEqual(sampleLocation);
    });

    it('should throw error when location is missing from result', async () => {
      const insertedData = {
        id: 'member-1',
        list_id: 'list-1',
        location_id: 1,
        created_at: '2024-01-01T00:00:00Z',
        locations: null,
      };

      mockFrom.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: insertedData, error: null }),
          })),
        })),
      });

      await expect(addLocationToList('list-1', 1)).rejects.toThrow(
        'Location missing for membership record'
      );
    });

    it('should throw error on insert failure', async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'Duplicate entry' },
            }),
          })),
        })),
      });

      await expect(addLocationToList('list-1', 1)).rejects.toEqual({
        code: '23505',
        message: 'Duplicate entry',
      });
    });
  });

  describe('removeLocationFromList', () => {
    it('should remove a location from a list', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
      });

      await expect(removeLocationFromList('list-1', 1)).resolves.toBeUndefined();
      expect(mockFrom).toHaveBeenCalledWith('location_list_members');
    });

    it('should throw error on delete failure', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              error: { code: 'PGRST500', message: 'Delete failed' },
            }),
          })),
        })),
      });

      await expect(removeLocationFromList('list-1', 1)).rejects.toEqual({
        code: 'PGRST500',
        message: 'Delete failed',
      });
    });
  });
});

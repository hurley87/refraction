import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Player } from '@/lib/types';

// Mock the supabase client
const mockRpc = vi.fn();
const mockSingle = vi.fn();
const mockIn = vi.fn();
const mockRange = vi.fn();
const mockOrderSecondary = vi.fn(() => ({ range: mockRange }));
const mockOrder = vi.fn(() => ({ order: mockOrderSecondary }));
const mockEq = vi.fn<any>(() => ({
  single: mockSingle,
  order: mockOrder,
}));
const mockSelect = vi.fn(() => ({
  eq: mockEq,
  order: mockOrder,
  in: mockIn,
}));
const mockFrom = vi.fn(() => ({
  select: mockSelect,
}));

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: () => mockFrom(),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import {
  getLeaderboard,
  getPlayerStats,
  verifyLeaderboardRPC,
} from '../leaderboard';

describe('Leaderboard Database Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock chains
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
      in: mockIn,
    });
    mockEq.mockReturnValue({
      single: mockSingle,
      order: mockOrder,
    });
    mockOrder.mockReturnValue({ order: mockOrderSecondary });
    mockOrderSecondary.mockReturnValue({ range: mockRange });
    mockIn.mockResolvedValue({ data: [], error: null });
  });

  describe('verifyLeaderboardRPC', () => {
    it('should return true when RPC function exists and works', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ player_id: 1, rank: 1 }],
        error: null,
      });

      const result = await verifyLeaderboardRPC();

      expect(result).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith('get_leaderboard_optimized', {
        page_limit: 1,
        page_offset: 0,
      });
    });

    it('should return true even for empty array response', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await verifyLeaderboardRPC();

      expect(result).toBe(true);
    });

    it('should return false when RPC function errors', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'function does not exist' },
      });

      const result = await verifyLeaderboardRPC();

      expect(result).toBe(false);
    });

    it('should return false on exception', async () => {
      mockRpc.mockRejectedValueOnce(new Error('Network error'));

      const result = await verifyLeaderboardRPC();

      expect(result).toBe(false);
    });
  });

  describe('getLeaderboard', () => {
    it('should use RPC when available and return mapped entries', async () => {
      const rpcData = [
        {
          player_id: 1,
          wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
          username: 'player1',
          email: 'player1@test.com',
          total_points: 500,
          total_checkins: 10,
          rank: 1,
        },
        {
          player_id: 2,
          wallet_address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          username: 'player2',
          email: null,
          total_points: 300,
          total_checkins: 5,
          rank: 2,
        },
      ];

      mockRpc.mockResolvedValueOnce({ data: rpcData, error: null });

      const result = await getLeaderboard(50, 0);

      expect(result).toHaveLength(2);
      expect(result[0].player_id).toBe(1);
      expect(result[0].rank).toBe(1);
      expect(result[0].total_points).toBe(500);
      expect(result[1].rank).toBe(2);
      expect(mockRpc).toHaveBeenCalledWith('get_leaderboard_optimized', {
        page_limit: 50,
        page_offset: 0,
      });
    });

    it('should fall back to manual query when RPC fails', async () => {
      const playersData = [
        {
          id: 1,
          wallet_address: '0x1234',
          username: 'player1',
          email: null,
          total_points: 500,
        },
        {
          id: 2,
          wallet_address: '0x5678',
          username: 'player2',
          email: null,
          total_points: 300,
        },
      ];

      const checkinsData = [
        { player_id: 1 },
        { player_id: 1 },
        { player_id: 2 },
      ];

      // RPC fails
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'function does not exist' },
      });

      // Fallback query succeeds
      mockRange.mockResolvedValueOnce({ data: playersData, error: null });
      mockIn.mockResolvedValueOnce({ data: checkinsData, error: null });

      const result = await getLeaderboard(50, 0);

      expect(result).toHaveLength(2);
      expect(result[0].player_id).toBe(1);
      expect(result[0].total_checkins).toBe(2); // 2 checkins for player 1
      expect(result[1].total_checkins).toBe(1); // 1 checkin for player 2
    });

    it('should calculate dense rank correctly - same points get same rank', async () => {
      const playersData = [
        {
          id: 1,
          wallet_address: '0x1234',
          username: 'player1',
          email: null,
          total_points: 500,
        },
        {
          id: 2,
          wallet_address: '0x5678',
          username: 'player2',
          email: null,
          total_points: 500,
        }, // Same points
        {
          id: 3,
          wallet_address: '0xabcd',
          username: 'player3',
          email: null,
          total_points: 300,
        },
      ];

      // RPC fails to trigger fallback
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC failed' },
      });

      mockRange.mockResolvedValueOnce({ data: playersData, error: null });
      mockIn.mockResolvedValueOnce({ data: [], error: null });

      const result = await getLeaderboard(50, 0);

      expect(result).toHaveLength(3);
      expect(result[0].rank).toBe(1); // First place
      expect(result[1].rank).toBe(1); // Same rank - tied with player 1 (DENSE_RANK behavior)
      expect(result[2].rank).toBe(2); // Second distinct rank (DENSE_RANK doesn't skip ranks)
    });

    it('should handle pagination with offset and limit', async () => {
      const rpcData = [
        {
          player_id: 11,
          wallet_address: '0x1111',
          username: 'player11',
          email: null,
          total_points: 100,
          total_checkins: 2,
          rank: 11,
        },
        {
          player_id: 12,
          wallet_address: '0x1212',
          username: 'player12',
          email: null,
          total_points: 90,
          total_checkins: 1,
          rank: 12,
        },
      ];

      mockRpc.mockResolvedValueOnce({ data: rpcData, error: null });

      const result = await getLeaderboard(10, 10); // Page 2 with 10 per page

      expect(mockRpc).toHaveBeenCalledWith('get_leaderboard_optimized', {
        page_limit: 10,
        page_offset: 10,
      });
      expect(result).toHaveLength(2);
      expect(result[0].rank).toBe(11);
    });

    it('should return empty array when no players exist', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null });

      const result = await getLeaderboard();

      expect(result).toEqual([]);
    });

    it('should throw error when fallback query fails', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC failed' },
      });
      mockRange.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(getLeaderboard()).rejects.toEqual({
        message: 'Database error',
      });
    });

    it('should handle null values in RPC response gracefully', async () => {
      const rpcData = [
        {
          player_id: 1,
          wallet_address: '0x1234',
          username: null,
          email: null,
          total_points: null,
          total_checkins: null,
          rank: null,
        },
      ];

      mockRpc.mockResolvedValueOnce({ data: rpcData, error: null });

      const result = await getLeaderboard();

      expect(result).toHaveLength(1);
      expect(result[0].username).toBeUndefined();
      expect(result[0].total_points).toBe(0);
      expect(result[0].total_checkins).toBe(0);
      expect(result[0].rank).toBe(0);
    });
  });

  describe('getPlayerStats', () => {
    it('should return combined player data with checkins', async () => {
      const mockPlayer: Player = {
        id: 1,
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'testplayer',
        email: 'test@example.com',
        total_points: 500,
      };

      const mockCheckins = [
        {
          id: 'checkin-1',
          player_id: 1,
          location_id: 'loc-1',
          created_at: '2024-01-01T10:00:00Z',
          locations: {
            name: 'Location 1',
            latitude: 0,
            longitude: 0,
          },
        },
        {
          id: 'checkin-2',
          player_id: 1,
          location_id: 'loc-2',
          created_at: '2024-01-02T10:00:00Z',
          locations: {
            name: 'Location 2',
            latitude: 0,
            longitude: 0,
          },
        },
      ];

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: get player .from('players').select('*').eq('id', playerId).single()
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: mockPlayer, error: null }),
              }),
            }),
          };
        } else {
          // Second call: get checkins .from('player_location_checkins').select().eq().order()
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi
                  .fn()
                  .mockResolvedValue({ data: mockCheckins, error: null }),
              }),
            }),
          };
        }
      });

      const result = await getPlayerStats(1);

      expect(result.player).toEqual(mockPlayer);
      expect(result.checkins).toEqual(mockCheckins);
      expect(result.totalCheckins).toBe(2);
      expect(result.totalPoints).toBe(500);
    });

    it('should throw error when player not found', async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'Player not found' },
            }),
          }),
        }),
      });

      await expect(getPlayerStats(999)).rejects.toEqual({
        code: 'PGRST116',
        message: 'Player not found',
      });
    });

    it('should throw error when checkins query fails', async () => {
      const mockPlayer: Player = {
        id: 1,
        wallet_address: '0x1234',
        total_points: 100,
      };

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: get player succeeds
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: mockPlayer, error: null }),
              }),
            }),
          };
        } else {
          // Second call: get checkins fails
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Checkins query failed' },
                }),
              }),
            }),
          };
        }
      });

      await expect(getPlayerStats(1)).rejects.toEqual({
        message: 'Checkins query failed',
      });
    });
  });
});

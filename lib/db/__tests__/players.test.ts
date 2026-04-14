import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Player } from '@/lib/types';

// Mock the supabase client
const mockRpc = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn(() => ({
  single: mockSingle,
  eq: vi.fn(() => ({ single: mockSingle })),
}));
const mockEq = vi.fn(() => ({
  single: mockSingle,
  maybeSingle: mockMaybeSingle,
  select: mockSelect,
}));
const mockInsert = vi.fn(() => ({ select: mockSelect }));
const mockUpdate = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
}));

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: () => mockFrom(),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import { getAddress } from 'viem';
import {
  getPlayerByWallet,
  getPlayerIdByWalletAddress,
  getPlayerBySolanaWallet,
  getPlayerByStellarWallet,
  getPlayerByEmail,
  createOrUpdatePlayer,
  updatePlayerPoints,
} from '../players';

describe('Players Database Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock chain
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
      single: mockSingle,
    });
    mockEq.mockReturnValue({
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      select: mockSelect,
    });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockUpdate.mockReturnValue({ eq: mockEq });
  });

  describe('getPlayerIdByWalletAddress', () => {
    it('falls back to raw input when checksummed EVM lookup misses', async () => {
      // Pick an address whose EIP-55 form differs from all-lowercase (0x00…01 checksums equal).
      const rawLower = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
      const checksummed = getAddress(rawLower as `0x${string}`);
      expect(checksummed).not.toBe(rawLower);

      mockMaybeSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { id: 99 }, error: null });

      const id = await getPlayerIdByWalletAddress(rawLower);

      expect(id).toBe(99);
      expect(mockMaybeSingle).toHaveBeenCalledTimes(2);
      expect(mockEq).toHaveBeenNthCalledWith(1, 'wallet_address', checksummed);
      expect(mockEq).toHaveBeenNthCalledWith(2, 'wallet_address', rawLower);
    });

    it('returns null when no row matches', async () => {
      mockMaybeSingle.mockReset();
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      const id = await getPlayerIdByWalletAddress(
        '0x0000000000000000000000000000000000000002'
      );

      expect(id).toBeNull();
    });
  });

  describe('getPlayerByWallet', () => {
    it('should return player when found', async () => {
      const mockPlayer: Player = {
        id: 1,
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'testuser',
        total_points: 100,
      };

      mockSingle.mockResolvedValueOnce({ data: mockPlayer, error: null });

      const result = await getPlayerByWallet(
        '0x1234567890abcdef1234567890abcdef12345678'
      );

      expect(result).toEqual(mockPlayer);
      expect(mockFrom).toHaveBeenCalled();
    });

    it('resolves EVM player when DB stores different casing than input', async () => {
      const rawLower = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
      const checksummed = getAddress(rawLower as `0x${string}`);
      const mockPlayer: Player = {
        id: 42,
        wallet_address: rawLower,
        username: 'mixedcase',
        total_points: 10,
      };

      mockSingle
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        })
        .mockResolvedValueOnce({ data: mockPlayer, error: null });

      const result = await getPlayerByWallet(checksummed);

      expect(result).toEqual(mockPlayer);
      expect(mockSingle).toHaveBeenCalledTimes(2);
    });

    it('should return null when not found (PGRST116)', async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        });

      const result = await getPlayerByWallet(
        '0x1234567890abcdef1234567890abcdef12345678'
      );

      expect(result).toBeNull();
    });

    it('should throw error for other database errors', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Database error' },
      });

      await expect(
        getPlayerByWallet('0x1234567890abcdef1234567890abcdef12345678')
      ).rejects.toEqual({ code: 'PGRST500', message: 'Database error' });
    });
  });

  describe('getPlayerBySolanaWallet', () => {
    it('should return player when found', async () => {
      const mockPlayer: Player = {
        id: 1,
        wallet_address: '',
        solana_wallet_address: '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T',
        total_points: 50,
      };

      mockSingle.mockResolvedValueOnce({ data: mockPlayer, error: null });

      const result = await getPlayerBySolanaWallet(
        '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T'
      );

      expect(result).toEqual(mockPlayer);
    });

    it('should return null when not found (PGRST116)', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await getPlayerBySolanaWallet(
        '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T'
      );

      expect(result).toBeNull();
    });
  });

  describe('getPlayerByStellarWallet', () => {
    it('should return player when found', async () => {
      const mockPlayer: Player = {
        id: 1,
        wallet_address: '',
        stellar_wallet_address:
          'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        total_points: 75,
      };

      mockSingle.mockResolvedValueOnce({ data: mockPlayer, error: null });

      const result = await getPlayerByStellarWallet(
        'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H'
      );

      expect(result).toEqual(mockPlayer);
    });

    it('should return null when not found (PGRST116)', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await getPlayerByStellarWallet(
        'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H'
      );

      expect(result).toBeNull();
    });
  });

  describe('getPlayerByEmail', () => {
    it('should return player when found', async () => {
      const mockPlayer: Player = {
        id: 1,
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        email: 'test@example.com',
        total_points: 200,
      };

      mockSingle.mockResolvedValueOnce({ data: mockPlayer, error: null });

      const result = await getPlayerByEmail('test@example.com');

      expect(result).toEqual(mockPlayer);
    });

    it('should return null when not found (PGRST116)', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await getPlayerByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('createOrUpdatePlayer', () => {
    it('should update existing player', async () => {
      const existingPlayer: Player = {
        id: 1,
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'olduser',
        email: 'old@example.com',
        total_points: 100,
      };

      const updatedPlayer: Player = {
        ...existingPlayer,
        username: 'newuser',
        email: 'new@example.com',
      };

      // First call finds existing player
      mockSingle.mockResolvedValueOnce({ data: existingPlayer, error: null });
      // Second call updates player
      mockSingle.mockResolvedValueOnce({ data: updatedPlayer, error: null });

      const result = await createOrUpdatePlayer({
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'newuser',
        email: 'new@example.com',
        total_points: 100,
      });

      expect(result).toEqual(updatedPlayer);
    });

    it('should create new player when not exists', async () => {
      const newPlayer: Player = {
        id: 1,
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'newuser',
        email: 'test@example.com',
        total_points: 0,
      };

      // First call returns no existing player
      mockSingle.mockResolvedValueOnce({ data: null, error: null });
      // Second call creates new player
      mockSingle.mockResolvedValueOnce({ data: newPlayer, error: null });

      const result = await createOrUpdatePlayer({
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'newuser',
        email: 'test@example.com',
        total_points: 0,
      });

      expect(result).toEqual(newPlayer);
    });

    it('should throw error on update failure', async () => {
      const existingPlayer: Player = {
        id: 1,
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        total_points: 100,
      };

      // First call finds existing player
      mockSingle.mockResolvedValueOnce({ data: existingPlayer, error: null });
      // Second call fails
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Update failed' },
      });

      await expect(
        createOrUpdatePlayer({
          wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
          username: 'newuser',
          total_points: 100,
        })
      ).rejects.toEqual({ code: 'PGRST500', message: 'Update failed' });
    });

    it('should throw error on insert failure', async () => {
      // First call returns no existing player
      mockSingle.mockResolvedValueOnce({ data: null, error: null });
      // Second call fails
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Insert failed' },
      });

      await expect(
        createOrUpdatePlayer({
          wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
          username: 'newuser',
          total_points: 0,
        })
      ).rejects.toEqual({ code: 'PGRST500', message: 'Insert failed' });
    });
  });

  describe('updatePlayerPoints', () => {
    it('should correctly add points to existing total', async () => {
      const updatedPlayer: Player = {
        id: 1,
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        total_points: 150,
      };

      // RPC function fails (not deployed), falls back to manual update
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'function does not exist' },
      });
      // Fallback: First call gets current points
      mockSingle.mockResolvedValueOnce({
        data: { total_points: 100 },
        error: null,
      });
      // Fallback: Second call updates points
      mockSingle.mockResolvedValueOnce({ data: updatedPlayer, error: null });

      const result = await updatePlayerPoints(1, 50);

      expect(result).toEqual(updatedPlayer);
      expect(result.total_points).toBe(150);
    });

    it('should handle zero initial points', async () => {
      const updatedPlayer: Player = {
        id: 1,
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        total_points: 100,
      };

      // RPC function fails, falls back
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'function does not exist' },
      });
      mockSingle.mockResolvedValueOnce({
        data: { total_points: 0 },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({ data: updatedPlayer, error: null });

      const result = await updatePlayerPoints(1, 100);

      expect(result.total_points).toBe(100);
    });

    it('should handle null total_points as zero', async () => {
      const updatedPlayer: Player = {
        id: 1,
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        total_points: 50,
      };

      // RPC function fails, falls back
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'function does not exist' },
      });
      mockSingle.mockResolvedValueOnce({
        data: { total_points: null },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({ data: updatedPlayer, error: null });

      const result = await updatePlayerPoints(1, 50);

      expect(result.total_points).toBe(50);
    });

    it('should throw error on fetch failure', async () => {
      // RPC function fails, falls back
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'function does not exist' },
      });
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Fetch failed' },
      });

      await expect(updatePlayerPoints(1, 50)).rejects.toEqual({
        code: 'PGRST500',
        message: 'Fetch failed',
      });
    });

    it('should throw error on update failure', async () => {
      // RPC function fails, falls back
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'function does not exist' },
      });
      mockSingle.mockResolvedValueOnce({
        data: { total_points: 100 },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Update failed' },
      });

      await expect(updatePlayerPoints(1, 50)).rejects.toEqual({
        code: 'PGRST500',
        message: 'Update failed',
      });
    });
  });
});

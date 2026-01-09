import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Player } from '@/lib/types'

// Mock the supabase client
const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle, eq: vi.fn(() => ({ single: mockSingle })) }))
const mockEq = vi.fn(() => ({ single: mockSingle, select: mockSelect }))
const mockInsert = vi.fn(() => ({ select: mockSelect }))
const mockUpdate = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
}))

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}))

import {
  getPlayerByWallet,
  getPlayerBySolanaWallet,
  getPlayerByStellarWallet,
  getPlayerByEmail,
  createOrUpdatePlayer,
  updatePlayerPoints,
} from '../players'

describe('Players Database Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock chain
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    })
    mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle })
    mockEq.mockReturnValue({ single: mockSingle, select: mockSelect })
    mockInsert.mockReturnValue({ select: mockSelect })
    mockUpdate.mockReturnValue({ eq: mockEq })
  })

  describe('getPlayerByWallet', () => {
    it('should return player when found', async () => {
      const mockPlayer: Player = {
        id: 1,
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'testuser',
        total_points: 100,
      }

      mockSingle.mockResolvedValueOnce({ data: mockPlayer, error: null })

      const result = await getPlayerByWallet('0x1234567890abcdef1234567890abcdef12345678')

      expect(result).toEqual(mockPlayer)
      expect(mockFrom).toHaveBeenCalledWith('players')
    })

    it('should return null when not found (PGRST116)', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      const result = await getPlayerByWallet('0x1234567890abcdef1234567890abcdef12345678')

      expect(result).toBeNull()
    })

    it('should throw error for other database errors', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Database error' },
      })

      await expect(getPlayerByWallet('0x1234567890abcdef1234567890abcdef12345678'))
        .rejects.toEqual({ code: 'PGRST500', message: 'Database error' })
    })
  })

  describe('getPlayerBySolanaWallet', () => {
    it('should return player when found', async () => {
      const mockPlayer: Player = {
        id: 1,
        wallet_address: '',
        solana_wallet_address: '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T',
        total_points: 50,
      }

      mockSingle.mockResolvedValueOnce({ data: mockPlayer, error: null })

      const result = await getPlayerBySolanaWallet('4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T')

      expect(result).toEqual(mockPlayer)
    })

    it('should return null when not found (PGRST116)', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      const result = await getPlayerBySolanaWallet('4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T')

      expect(result).toBeNull()
    })
  })

  describe('getPlayerByStellarWallet', () => {
    it('should return player when found', async () => {
      const mockPlayer: Player = {
        id: 1,
        wallet_address: '',
        stellar_wallet_address: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        total_points: 75,
      }

      mockSingle.mockResolvedValueOnce({ data: mockPlayer, error: null })

      const result = await getPlayerByStellarWallet('GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H')

      expect(result).toEqual(mockPlayer)
    })

    it('should return null when not found (PGRST116)', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      const result = await getPlayerByStellarWallet('GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H')

      expect(result).toBeNull()
    })
  })

  describe('getPlayerByEmail', () => {
    it('should return player when found', async () => {
      const mockPlayer: Player = {
        id: 1,
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        email: 'test@example.com',
        total_points: 200,
      }

      mockSingle.mockResolvedValueOnce({ data: mockPlayer, error: null })

      const result = await getPlayerByEmail('test@example.com')

      expect(result).toEqual(mockPlayer)
    })

    it('should return null when not found (PGRST116)', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      const result = await getPlayerByEmail('notfound@example.com')

      expect(result).toBeNull()
    })
  })

  describe('createOrUpdatePlayer', () => {
    it('should update existing player', async () => {
      const existingPlayer: Player = {
        id: 1,
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'olduser',
        email: 'old@example.com',
        total_points: 100,
      }

      const updatedPlayer: Player = {
        ...existingPlayer,
        username: 'newuser',
        email: 'new@example.com',
      }

      // First call finds existing player
      mockSingle.mockResolvedValueOnce({ data: existingPlayer, error: null })
      // Second call updates player
      mockSingle.mockResolvedValueOnce({ data: updatedPlayer, error: null })

      const result = await createOrUpdatePlayer({
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'newuser',
        email: 'new@example.com',
        total_points: 100,
      })

      expect(result).toEqual(updatedPlayer)
    })

    it('should create new player when not exists', async () => {
      const newPlayer: Player = {
        id: 1,
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'newuser',
        email: 'test@example.com',
        total_points: 0,
      }

      // First call returns no existing player
      mockSingle.mockResolvedValueOnce({ data: null, error: null })
      // Second call creates new player
      mockSingle.mockResolvedValueOnce({ data: newPlayer, error: null })

      const result = await createOrUpdatePlayer({
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'newuser',
        email: 'test@example.com',
        total_points: 0,
      })

      expect(result).toEqual(newPlayer)
    })

    it('should throw error on update failure', async () => {
      const existingPlayer: Player = {
        id: 1,
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        total_points: 100,
      }

      // First call finds existing player
      mockSingle.mockResolvedValueOnce({ data: existingPlayer, error: null })
      // Second call fails
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Update failed' },
      })

      await expect(createOrUpdatePlayer({
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'newuser',
        total_points: 100,
      })).rejects.toEqual({ code: 'PGRST500', message: 'Update failed' })
    })

    it('should throw error on insert failure', async () => {
      // First call returns no existing player
      mockSingle.mockResolvedValueOnce({ data: null, error: null })
      // Second call fails
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Insert failed' },
      })

      await expect(createOrUpdatePlayer({
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'newuser',
        total_points: 0,
      })).rejects.toEqual({ code: 'PGRST500', message: 'Insert failed' })
    })
  })

  describe('updatePlayerPoints', () => {
    it('should correctly add points to existing total', async () => {
      const currentPlayer = { total_points: 100 }
      const updatedPlayer: Player = {
        id: 1,
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        total_points: 150,
      }

      // First call gets current points
      mockSingle.mockResolvedValueOnce({ data: currentPlayer, error: null })
      // Second call updates points
      mockSingle.mockResolvedValueOnce({ data: updatedPlayer, error: null })

      const result = await updatePlayerPoints(1, 50)

      expect(result).toEqual(updatedPlayer)
      expect(result.total_points).toBe(150)
    })

    it('should handle zero initial points', async () => {
      const currentPlayer = { total_points: 0 }
      const updatedPlayer: Player = {
        id: 1,
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        total_points: 100,
      }

      mockSingle.mockResolvedValueOnce({ data: currentPlayer, error: null })
      mockSingle.mockResolvedValueOnce({ data: updatedPlayer, error: null })

      const result = await updatePlayerPoints(1, 100)

      expect(result.total_points).toBe(100)
    })

    it('should handle null total_points as zero', async () => {
      const currentPlayer = { total_points: null }
      const updatedPlayer: Player = {
        id: 1,
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        total_points: 50,
      }

      mockSingle.mockResolvedValueOnce({ data: currentPlayer, error: null })
      mockSingle.mockResolvedValueOnce({ data: updatedPlayer, error: null })

      const result = await updatePlayerPoints(1, 50)

      expect(result.total_points).toBe(50)
    })

    it('should throw error on fetch failure', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Fetch failed' },
      })

      await expect(updatePlayerPoints(1, 50))
        .rejects.toEqual({ code: 'PGRST500', message: 'Fetch failed' })
    })

    it('should throw error on update failure', async () => {
      const currentPlayer = { total_points: 100 }

      mockSingle.mockResolvedValueOnce({ data: currentPlayer, error: null })
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Update failed' },
      })

      await expect(updatePlayerPoints(1, 50))
        .rejects.toEqual({ code: 'PGRST500', message: 'Update failed' })
    })
  })
})

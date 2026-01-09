import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Perk, Player } from '@/lib/types'

// Mock the supabase client - using any to avoid complex typing
const mockSingle = vi.fn()
const mockLimit = vi.fn(() => ({ single: mockSingle }))
const mockOr = vi.fn<any>()
const mockLte = vi.fn<any>(() => ({ or: mockOr }))
const mockEq = vi.fn<any>(() => ({
  single: mockSingle,
  eq: vi.fn(() => ({ single: mockSingle, limit: mockLimit })),
  select: vi.fn(() => ({ single: mockSingle })),
  lte: mockLte,
  or: mockOr, // Add or to eq chain for getAllPerks
}))
const mockOrder = vi.fn<any>(() => ({
  eq: mockEq,
  or: mockOr,
}))
const mockSelect = vi.fn(() => ({
  single: mockSingle,
  eq: mockEq,
  order: mockOrder,
  lte: mockLte,
}))
const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }))
const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) }))
const mockDelete = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
}))

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: () => mockFrom(),
  },
}))

// Mock getPlayerByWallet
vi.mock('@/lib/db/players', () => ({
  getPlayerByWallet: vi.fn(),
}))

import {
  getAllPerks,
  getPerkById,
  getAvailablePerksForUser,
  redeemPerk,
  createPerk,
  updatePerk,
} from '../perks'
import { getPlayerByWallet } from '../players'

describe('Perks Database Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllPerks', () => {
    it('should return all active perks respecting end_date', async () => {
      const mockPerks: Perk[] = [
        { id: '1', title: 'Perk 1', description: 'Desc 1', points_threshold: 100, type: 'discount', is_active: true },
        { id: '2', title: 'Perk 2', description: 'Desc 2', points_threshold: 200, type: 'exclusive', is_active: true },
      ]

      mockOr.mockResolvedValueOnce({ data: mockPerks, error: null })

      const result = await getAllPerks(true)

      expect(result).toEqual(mockPerks)
      expect(mockFrom).toHaveBeenCalled()
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('should return all perks when activeOnly is false', async () => {
      const mockPerks: Perk[] = [
        { id: '1', title: 'Perk 1', description: 'Desc 1', points_threshold: 100, type: 'discount', is_active: true },
        { id: '2', title: 'Perk 2', description: 'Desc 2', points_threshold: 200, type: 'exclusive', is_active: false },
      ]

      // For activeOnly=false, the query goes directly to order() without eq/or
      mockOrder.mockResolvedValueOnce({ data: mockPerks, error: null })

      const result = await getAllPerks(false)

      expect(result).toEqual(mockPerks)
    })

    it('should throw error on database failure', async () => {
      mockOr.mockResolvedValueOnce({ data: null, error: { message: 'DB Error' } })

      await expect(getAllPerks(true)).rejects.toEqual({ message: 'DB Error' })
    })
  })

  describe('getPerkById', () => {
    it('should return perk when found', async () => {
      const mockPerk: Perk = {
        id: 'perk-123',
        title: 'Test Perk',
        description: 'A test perk',
        points_threshold: 100,
        type: 'discount',
        is_active: true,
      }

      mockSingle.mockResolvedValueOnce({ data: mockPerk, error: null })

      const result = await getPerkById('perk-123')

      expect(result).toEqual(mockPerk)
      expect(mockFrom).toHaveBeenCalled()
    })

    it('should throw error when perk not found', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' }
      })

      await expect(getPerkById('nonexistent')).rejects.toEqual({
        code: 'PGRST116',
        message: 'Not found'
      })
    })
  })

  describe('getAvailablePerksForUser', () => {
    it('should filter by points threshold and exclude redeemed', async () => {
      const mockPlayer: Player = {
        id: 1,
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        total_points: 500,
      }

      const mockPerks = [
        {
          id: '1',
          title: 'Affordable Perk',
          points_threshold: 100,
          user_perk_redemptions: []
        },
        {
          id: '2',
          title: 'Already Redeemed',
          points_threshold: 200,
          user_perk_redemptions: [{ id: 'r1', user_wallet_address: '0x1234567890abcdef1234567890abcdef12345678' }]
        },
      ]

      vi.mocked(getPlayerByWallet).mockResolvedValueOnce(mockPlayer)
      // getAvailablePerksForUser uses: .select().eq().lte().or()
      mockOr.mockResolvedValueOnce({ data: mockPerks, error: null })

      const result = await getAvailablePerksForUser('0x1234567890abcdef1234567890abcdef12345678')

      // Should only return the unredeemed perk
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('should return empty array when user has no points', async () => {
      vi.mocked(getPlayerByWallet).mockResolvedValueOnce(null)
      mockOr.mockResolvedValueOnce({ data: [], error: null })

      const result = await getAvailablePerksForUser('0x1234567890abcdef1234567890abcdef12345678')

      expect(result).toEqual([])
    })

    it('should throw error on database failure', async () => {
      vi.mocked(getPlayerByWallet).mockResolvedValueOnce({
        id: 1,
        wallet_address: '0x123',
        total_points: 500
      })
      mockOr.mockResolvedValueOnce({ data: null, error: { message: 'DB Error' } })

      await expect(getAvailablePerksForUser('0x123')).rejects.toEqual({ message: 'DB Error' })
    })
  })

  describe('redeemPerk', () => {
    const mockWallet = '0x1234567890abcdef1234567890abcdef12345678'
    const mockPerkId = 'perk-123'

    it('should successfully redeem perk with available code', async () => {
      const mockPlayer: Player = {
        id: 1,
        wallet_address: mockWallet,
        total_points: 500,
      }

      const mockPerk: Perk = {
        id: mockPerkId,
        title: 'Test Perk',
        description: 'Desc',
        points_threshold: 100,
        type: 'discount',
      }

      const mockCode = {
        id: 'code-123',
        code: 'DISCOUNT50',
        perk_id: mockPerkId,
        is_claimed: false,
      }

      const mockRedemption = {
        id: 'redemption-123',
        perk_id: mockPerkId,
        discount_code_id: 'code-123',
        user_wallet_address: mockWallet,
        perk_discount_codes: { code: 'DISCOUNT50' },
      }

      // Mock getPlayerByWallet
      vi.mocked(getPlayerByWallet).mockResolvedValueOnce(mockPlayer)

      // Mock getPerkById (first single call)
      mockSingle.mockResolvedValueOnce({ data: mockPerk, error: null })

      // Mock existing redemption check (second single call - returns null)
      mockSingle.mockResolvedValueOnce({ data: null, error: null })

      // Mock available code lookup (third single call)
      mockSingle.mockResolvedValueOnce({ data: mockCode, error: null })

      // Mock redemption insert (fourth single call)
      mockSingle.mockResolvedValueOnce({ data: mockRedemption, error: null })

      const result = await redeemPerk(mockPerkId, mockWallet)

      expect(result).toEqual(mockRedemption)
      expect(result.perk_discount_codes?.code).toBe('DISCOUNT50')
    })

    it('should throw error for insufficient points', async () => {
      const mockPlayer: Player = {
        id: 1,
        wallet_address: mockWallet,
        total_points: 50, // Less than threshold
      }

      const mockPerk: Perk = {
        id: mockPerkId,
        title: 'Expensive Perk',
        description: 'Desc',
        points_threshold: 500, // More than user has
        type: 'exclusive',
      }

      vi.mocked(getPlayerByWallet).mockResolvedValueOnce(mockPlayer)
      mockSingle.mockResolvedValueOnce({ data: mockPerk, error: null })

      await expect(redeemPerk(mockPerkId, mockWallet))
        .rejects.toThrow('Insufficient points to redeem this perk')
    })

    it('should throw error when user not found', async () => {
      const mockPerk: Perk = {
        id: mockPerkId,
        title: 'Test Perk',
        description: 'Desc',
        points_threshold: 100,
        type: 'discount',
      }

      vi.mocked(getPlayerByWallet).mockResolvedValueOnce(null)
      mockSingle.mockResolvedValueOnce({ data: mockPerk, error: null })

      await expect(redeemPerk(mockPerkId, mockWallet))
        .rejects.toThrow('Insufficient points to redeem this perk')
    })

    it('should throw error when already redeemed', async () => {
      const mockPlayer: Player = {
        id: 1,
        wallet_address: mockWallet,
        total_points: 500,
      }

      const mockPerk: Perk = {
        id: mockPerkId,
        title: 'Test Perk',
        description: 'Desc',
        points_threshold: 100,
        type: 'discount',
      }

      const existingRedemption = {
        id: 'existing-redemption',
        perk_id: mockPerkId,
        user_wallet_address: mockWallet,
      }

      vi.mocked(getPlayerByWallet).mockResolvedValueOnce(mockPlayer)
      mockSingle.mockResolvedValueOnce({ data: mockPerk, error: null })
      mockSingle.mockResolvedValueOnce({ data: existingRedemption, error: null })

      await expect(redeemPerk(mockPerkId, mockWallet))
        .rejects.toThrow('Perk already redeemed')
    })

    it('should throw error when no codes available', async () => {
      const mockPlayer: Player = {
        id: 1,
        wallet_address: mockWallet,
        total_points: 500,
      }

      const mockPerk: Perk = {
        id: mockPerkId,
        title: 'Test Perk',
        description: 'Desc',
        points_threshold: 100,
        type: 'discount',
      }

      vi.mocked(getPlayerByWallet).mockResolvedValueOnce(mockPlayer)
      mockSingle.mockResolvedValueOnce({ data: mockPerk, error: null })
      mockSingle.mockResolvedValueOnce({ data: null, error: null }) // No existing redemption
      mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // No available codes

      await expect(redeemPerk(mockPerkId, mockWallet))
        .rejects.toThrow('No discount codes available for this perk')
    })
  })

  describe('createPerk', () => {
    it('should create a new perk', async () => {
      const newPerk = {
        title: 'New Perk',
        description: 'A new perk',
        points_threshold: 200,
        type: 'discount',
        is_active: true,
      }

      const createdPerk = {
        ...newPerk,
        id: 'new-perk-123',
        created_at: '2024-01-01T00:00:00Z',
      }

      mockSingle.mockResolvedValueOnce({ data: createdPerk, error: null })

      const result = await createPerk(newPerk)

      expect(result).toEqual(createdPerk)
      expect(mockFrom).toHaveBeenCalled()
    })

    it('should throw error on creation failure', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' }
      })

      await expect(createPerk({
        title: 'Test',
        description: 'Test',
        points_threshold: 100,
        type: 'discount',
      })).rejects.toEqual({ message: 'Insert failed' })
    })
  })

  describe('updatePerk', () => {
    it('should update an existing perk', async () => {
      const updatedPerk = {
        id: 'perk-123',
        title: 'Updated Perk',
        description: 'Updated description',
        points_threshold: 300,
        type: 'exclusive',
        is_active: true,
        updated_at: '2024-01-02T00:00:00Z',
      }

      mockSingle.mockResolvedValueOnce({ data: updatedPerk, error: null })

      const result = await updatePerk('perk-123', { title: 'Updated Perk' })

      expect(result).toEqual(updatedPerk)
    })

    it('should throw error on update failure', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' }
      })

      await expect(updatePerk('perk-123', { title: 'Test' }))
        .rejects.toEqual({ message: 'Update failed' })
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Tier } from '@/lib/types'

// Mock the supabase client
const mockOrder = vi.fn()
const mockSelect = vi.fn(() => ({ order: mockOrder }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: () => mockFrom(),
  },
}))

import { getTiers, resolveTierForPoints, getTierForPoints } from '../tiers'

// Sample tier data for testing
const sampleTiers: Tier[] = [
  {
    id: 'tier-1',
    title: 'Bronze',
    min_points: 0,
    max_points: 100,
    description: 'Starting tier',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'tier-2',
    title: 'Silver',
    min_points: 100,
    max_points: 500,
    description: 'Intermediate tier',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'tier-3',
    title: 'Gold',
    min_points: 500,
    max_points: 1000,
    description: 'Advanced tier',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'tier-4',
    title: 'Platinum',
    min_points: 1000,
    max_points: null, // Highest tier has no upper limit
    description: 'Elite tier',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

describe('Tiers Database Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ order: mockOrder })
  })

  describe('getTiers', () => {
    it('should return all tiers ordered by min_points', async () => {
      mockOrder.mockResolvedValueOnce({ data: sampleTiers, error: null })

      const result = await getTiers()

      expect(result).toEqual(sampleTiers)
      expect(mockFrom).toHaveBeenCalled()
    })

    it('should return empty array when no tiers exist', async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null })

      const result = await getTiers()

      expect(result).toEqual([])
    })

    it('should return empty array when data is null', async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: null })

      const result = await getTiers()

      expect(result).toEqual([])
    })

    it('should throw error on database failure', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Database error' },
      })

      await expect(getTiers()).rejects.toEqual({
        code: 'PGRST500',
        message: 'Database error',
      })
    })
  })

  describe('resolveTierForPoints', () => {
    it('should return lowest tier for 0 points', () => {
      const result = resolveTierForPoints(sampleTiers, 0)

      expect(result).toEqual(sampleTiers[0])
      expect(result?.title).toBe('Bronze')
    })

    it('should return correct tier for points within range', () => {
      const result = resolveTierForPoints(sampleTiers, 250)

      expect(result).toEqual(sampleTiers[1])
      expect(result?.title).toBe('Silver')
    })

    it('should return correct tier at exact lower boundary', () => {
      const result = resolveTierForPoints(sampleTiers, 100)

      expect(result).toEqual(sampleTiers[1])
      expect(result?.title).toBe('Silver')
    })

    it('should return previous tier at exact upper boundary (max_points is exclusive)', () => {
      // 99 points is still in Bronze (max_points=100 is exclusive)
      const result = resolveTierForPoints(sampleTiers, 99)

      expect(result).toEqual(sampleTiers[0])
      expect(result?.title).toBe('Bronze')
    })

    it('should return highest tier for points exceeding all boundaries', () => {
      const result = resolveTierForPoints(sampleTiers, 10000)

      expect(result).toEqual(sampleTiers[3])
      expect(result?.title).toBe('Platinum')
    })

    it('should handle highest tier with max_points=null correctly', () => {
      const result = resolveTierForPoints(sampleTiers, 999999)

      expect(result).toEqual(sampleTiers[3])
      expect(result?.title).toBe('Platinum')
      expect(result?.max_points).toBeNull()
    })

    it('should return null when no tiers exist', () => {
      const result = resolveTierForPoints([], 100)

      expect(result).toBeNull()
    })

    it('should return null when points are negative and no tier covers negative', () => {
      const result = resolveTierForPoints(sampleTiers, -10)

      expect(result).toBeNull()
    })

    it('should handle single tier correctly', () => {
      const singleTier: Tier[] = [
        {
          id: 'only-tier',
          title: 'Only Tier',
          min_points: 0,
          max_points: null,
          description: 'The only tier',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      const result = resolveTierForPoints(singleTier, 500)

      expect(result).toEqual(singleTier[0])
    })

    it('should handle tier with zero range (min equals max)', () => {
      // Edge case: if min_points=100 and max_points=100, no points would match
      const edgeTiers: Tier[] = [
        {
          id: 'edge-tier',
          title: 'Edge Tier',
          min_points: 100,
          max_points: 100,
          description: 'Zero range tier',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      // 100 points: min_points=100 (match), max_points=100 (100 < 100 is false)
      const result = resolveTierForPoints(edgeTiers, 100)
      expect(result).toBeNull()
    })
  })

  describe('getTierForPoints', () => {
    it('should fetch tiers and resolve correct tier for points', async () => {
      mockOrder.mockResolvedValueOnce({ data: sampleTiers, error: null })

      const result = await getTierForPoints(250)

      expect(result).toEqual(sampleTiers[1])
      expect(result?.title).toBe('Silver')
    })

    it('should return lowest tier for 0 points', async () => {
      mockOrder.mockResolvedValueOnce({ data: sampleTiers, error: null })

      const result = await getTierForPoints(0)

      expect(result).toEqual(sampleTiers[0])
      expect(result?.title).toBe('Bronze')
    })

    it('should return highest tier for very high points', async () => {
      mockOrder.mockResolvedValueOnce({ data: sampleTiers, error: null })

      const result = await getTierForPoints(50000)

      expect(result).toEqual(sampleTiers[3])
      expect(result?.title).toBe('Platinum')
    })

    it('should return null when no tiers exist', async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null })

      const result = await getTierForPoints(100)

      expect(result).toBeNull()
    })

    it('should throw error on database failure', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(getTierForPoints(100)).rejects.toEqual({
        message: 'Database error',
      })
    })

    it('should handle exact boundary transitions correctly', async () => {
      mockOrder.mockResolvedValueOnce({ data: sampleTiers, error: null })

      // At exactly 500 points, should be Gold (min_points=500)
      const result = await getTierForPoints(500)

      expect(result).toEqual(sampleTiers[2])
      expect(result?.title).toBe('Gold')
    })
  })
})

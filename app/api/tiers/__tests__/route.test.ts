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

import { GET } from '../route'

describe('GET /api/tiers', () => {
  // Sample tier data for tests
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
      max_points: null,
      description: 'Elite tier',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ order: mockOrder })
  })

  describe('Success Cases', () => {
    it('should return all tiers with success: true', async () => {
      mockOrder.mockResolvedValueOnce({ data: sampleTiers, error: null })

      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.tiers).toEqual(sampleTiers)
    })

    it('should return tiers ordered by min_points ascending', async () => {
      mockOrder.mockResolvedValueOnce({ data: sampleTiers, error: null })

      const response = await GET()
      const json = await response.json()

      expect(json.data.tiers).toHaveLength(4)
      expect(json.data.tiers[0].min_points).toBe(0)
      expect(json.data.tiers[1].min_points).toBe(100)
      expect(json.data.tiers[2].min_points).toBe(500)
      expect(json.data.tiers[3].min_points).toBe(1000)
    })

    it('should return response matching Tier type structure', async () => {
      mockOrder.mockResolvedValueOnce({ data: sampleTiers, error: null })

      const response = await GET()
      const json = await response.json()

      const firstTier = json.data.tiers[0]
      expect(firstTier).toHaveProperty('id')
      expect(firstTier).toHaveProperty('title')
      expect(firstTier).toHaveProperty('min_points')
      expect(firstTier).toHaveProperty('max_points')
      expect(firstTier).toHaveProperty('description')
      expect(firstTier).toHaveProperty('created_at')
      expect(firstTier).toHaveProperty('updated_at')
    })

    it('should return empty array when no tiers exist', async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null })

      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.tiers).toEqual([])
    })

    it('should return empty array when data is null', async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: null })

      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.tiers).toEqual([])
    })
  })

  describe('Error Cases', () => {
    it('should return 500 on database error', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Database connection failed' },
      })

      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error).toContain('Failed to fetch tiers')
    })

    it('should return 500 when supabase throws', async () => {
      mockOrder.mockRejectedValueOnce(new Error('Unexpected error'))

      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
    })
  })

  describe('Response Format', () => {
    it('should return NextResponse with json body', async () => {
      mockOrder.mockResolvedValueOnce({ data: sampleTiers, error: null })

      const response = await GET()
      const json = await response.json()

      // Verify response structure follows ApiResponse type
      expect(typeof json.success).toBe('boolean')
      expect(json.data).toBeDefined()
    })
  })
})

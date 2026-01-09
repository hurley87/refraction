import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

// Mock the database functions
vi.mock('@/lib/db/players', () => ({
  createOrUpdatePlayer: vi.fn(),
  updatePlayerPoints: vi.fn(),
}))

vi.mock('@/lib/db/profiles', () => ({
  getUserProfile: vi.fn(),
}))

// Mock Supabase client
const mockSupabaseFrom = vi.fn()
vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: () => mockSupabaseFrom(),
  },
}))

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  trackCheckinCompleted: vi.fn(),
  trackPointsEarned: vi.fn(),
}))

import { createOrUpdatePlayer, updatePlayerPoints } from '@/lib/db/players'
import { trackCheckinCompleted, trackPointsEarned } from '@/lib/analytics'

// Helper to create a mock NextRequest
function createMockRequest(body: object): NextRequest {
  const url = new URL('http://localhost:3000/api/checkin')
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// Helper to create mock Supabase chain
function createMockSupabaseChain(options: {
  selectCount?: number | null
  selectError?: Error | null
  insertData?: object | null
  insertError?: Error | null
  sumData?: { points_earned: number }[] | null
  sumError?: Error | null
}) {
  const chainMethods = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    single: vi.fn(),
  }

  // Default successful flow
  let callCount = 0
  mockSupabaseFrom.mockImplementation(() => {
    callCount++

    // First call: count checkpoint checkins today
    if (callCount === 1) {
      return {
        ...chainMethods,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({
                  count: options.selectCount ?? 0,
                  error: options.selectError ?? null,
                }),
              }),
            }),
          }),
        }),
      }
    }

    // Second call: insert activity
    if (callCount === 2) {
      return {
        ...chainMethods,
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: options.insertData ?? { id: 'activity-123' },
              error: options.insertError ?? null,
            }),
          }),
        }),
      }
    }

    // Third call: get today's checkpoints sum
    if (callCount === 3) {
      return {
        ...chainMethods,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({
                  data: options.sumData ?? [{ points_earned: 100 }],
                  error: options.sumError ?? null,
                }),
              }),
            }),
          }),
        }),
      }
    }

    return chainMethods
  })
}

describe('Checkin API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/checkin', () => {
    it('should successfully process a checkin', async () => {
      const mockPlayer = {
        id: '123',
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'testuser',
        total_points: 0,
      }

      const updatedPlayer = {
        ...mockPlayer,
        total_points: 100,
      }

      vi.mocked(createOrUpdatePlayer).mockResolvedValueOnce(mockPlayer)
      vi.mocked(updatePlayerPoints).mockResolvedValueOnce(updatedPlayer)

      createMockSupabaseChain({
        selectCount: 0,
        insertData: { id: 'activity-123' },
        sumData: [{ points_earned: 100 }],
      })

      const request = createMockRequest({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: 'checkpoint-abc',
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.pointsAwarded).toBe(100)
      expect(json.data.player).toBeDefined()
      expect(json.message).toContain('100 points')

      expect(trackCheckinCompleted).toHaveBeenCalledWith(
        '0x1234567890abcdef1234567890abcdef12345678',
        expect.objectContaining({
          checkpoint: 'checkpoint-abc',
          points: 100,
          checkin_type: 'checkpoint',
        })
      )

      expect(trackPointsEarned).toHaveBeenCalledWith(
        '0x1234567890abcdef1234567890abcdef12345678',
        expect.objectContaining({
          activity_type: 'checkpoint_checkin',
          amount: 100,
        })
      )
    })

    it('should return 429 when daily checkpoint limit is reached', async () => {
      const mockPlayer = {
        id: '123',
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        total_points: 900,
      }

      vi.mocked(createOrUpdatePlayer).mockResolvedValueOnce(mockPlayer)

      createMockSupabaseChain({
        selectCount: 10, // Daily limit reached
      })

      const request = createMockRequest({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: 'checkpoint-abc',
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(429)
      expect(json.success).toBe(false)
      expect(json.error).toContain('Daily checkpoint limit')
    })

    it('should return validation error for missing wallet address', async () => {
      const request = createMockRequest({
        checkpoint: 'checkpoint-abc',
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
    })

    it('should return validation error for missing checkpoint', async () => {
      const request = createMockRequest({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(createOrUpdatePlayer).mockRejectedValueOnce(new Error('Database connection failed'))

      const request = createMockRequest({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: 'checkpoint-abc',
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
    })

    it('should include email in checkin when provided', async () => {
      const mockPlayer = {
        id: '123',
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        email: 'test@example.com',
        total_points: 0,
      }

      vi.mocked(createOrUpdatePlayer).mockResolvedValueOnce(mockPlayer)
      vi.mocked(updatePlayerPoints).mockResolvedValueOnce({
        ...mockPlayer,
        total_points: 100,
      })

      createMockSupabaseChain({
        selectCount: 0,
        insertData: { id: 'activity-123' },
        sumData: [{ points_earned: 100 }],
      })

      const request = createMockRequest({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: 'checkpoint-abc',
        email: 'test@example.com',
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })

    it('should calculate cumulative points earned today', async () => {
      const mockPlayer = {
        id: '123',
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        total_points: 200,
      }

      vi.mocked(createOrUpdatePlayer).mockResolvedValueOnce(mockPlayer)
      vi.mocked(updatePlayerPoints).mockResolvedValueOnce({
        ...mockPlayer,
        total_points: 300,
      })

      createMockSupabaseChain({
        selectCount: 2, // 2 previous checkins today
        insertData: { id: 'activity-123' },
        sumData: [
          { points_earned: 100 },
          { points_earned: 100 },
          { points_earned: 100 },
        ], // 300 total today
      })

      const request = createMockRequest({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: 'checkpoint-abc',
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.pointsEarnedToday).toBe(300)
    })
  })
})

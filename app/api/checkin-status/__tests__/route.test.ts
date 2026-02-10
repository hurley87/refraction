import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock date utility
vi.mock('@/lib/utils/date', () => ({
  getUtcDayBounds: vi.fn(() => ({
    startIso: '2024-01-01T00:00:00.000Z',
    endIso: '2024-01-02T00:00:00.000Z',
  })),
}))

// We need a flexible mock for supabase since the route runs three parallel queries
const mockFrom = vi.fn()

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { GET } from '../route'

function createMockRequest(searchParams?: Record<string, string>): Request {
  const url = new URL('http://localhost:3000/api/checkin-status')
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return new Request(url.toString(), { method: 'GET' })
}

/**
 * Creates a chainable supabase query mock that resolves to the given result.
 * Supports arbitrary chains of .select().eq().eq().gte().lt().contains().limit()
 */
function createQueryChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === 'then') {
        // Make the chain thenable so it resolves in Promise.all
        return (resolve: (v: unknown) => void) => resolve(result)
      }
      // Return a function that returns the proxy for any method call
      return () => new Proxy(chain, handler)
    },
  }
  return new Proxy(chain, handler)
}

describe('Checkin Status API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/checkin-status', () => {
    it('should return 400 when address is missing', async () => {
      const request = createMockRequest({ checkpoint: 'test-cp' })
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error).toBe('Address parameter is required')
    })

    it('should return 400 when checkpoint is missing', async () => {
      const request = createMockRequest({ address: '0x123' })
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error).toBe('Checkpoint parameter is required')
    })

    it('should return checkin status with no prior checkins', async () => {
      // Three parallel queries all return empty
      mockFrom.mockImplementation(() =>
        createQueryChain({ data: [], error: null })
      )

      const request = createMockRequest({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: 'test-cp',
      })
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.hasCheckedIn).toBe(false)
      expect(json.data.checkpointCheckinToday).toBe(false)
      expect(json.data.dailyRewardClaimed).toBe(false)
      expect(json.data.pointsEarnedToday).toBe(0)
    })

    it('should return hasCheckedIn true when user has all-time checkin', async () => {
      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // Today's checkpoint activities: some points
          return createQueryChain({
            data: [{ points_earned: 100 }],
            error: null,
          })
        }
        if (callCount === 2) {
          // Specific checkpoint today: yes
          return createQueryChain({
            data: [{ id: 1 }],
            error: null,
          })
        }
        // All-time checkpoint: yes
        return createQueryChain({
          data: [{ id: 1 }],
          error: null,
        })
      })

      const request = createMockRequest({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: 'test-cp',
      })
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.hasCheckedIn).toBe(true)
      expect(json.data.checkpointCheckinToday).toBe(true)
      expect(json.data.dailyRewardClaimed).toBe(true)
      expect(json.data.pointsEarnedToday).toBe(100)
    })

    it('should return 500 when database query fails', async () => {
      mockFrom.mockImplementation(() =>
        createQueryChain({ data: null, error: { message: 'DB error' } })
      )

      const request = createMockRequest({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: 'test-cp',
      })
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error).toBe('Failed to check check-in status')
    })

    it('should sum multiple points activities for today', async () => {
      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // Today's checkpoint activities: multiple
          return createQueryChain({
            data: [
              { points_earned: 100 },
              { points_earned: 100 },
              { points_earned: 100 },
            ],
            error: null,
          })
        }
        if (callCount === 2) {
          // Specific checkpoint today: no
          return createQueryChain({
            data: [],
            error: null,
          })
        }
        // All-time: yes
        return createQueryChain({
          data: [{ id: 1 }],
          error: null,
        })
      })

      const request = createMockRequest({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: 'test-cp',
      })
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.pointsEarnedToday).toBe(300)
      expect(json.data.dailyRewardClaimed).toBe(true)
      expect(json.data.hasCheckedIn).toBe(true)
      // Not checked in today at this specific checkpoint
      expect(json.data.checkpointCheckinToday).toBe(false)
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

// Mock the database functions
vi.mock('@/lib/db/leaderboard', () => ({
  getLeaderboard: vi.fn(),
  getPlayerStats: vi.fn(),
}))

// Mock Supabase client
vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        count: 100,
      }),
    }),
  },
}))

// Mock cache
vi.mock('@/lib/cache', () => ({
  leaderboardCache: {
    get: vi.fn(),
    set: vi.fn(),
  },
  playerStatsCache: {
    get: vi.fn(),
    set: vi.fn(),
  },
}))

import { getLeaderboard, getPlayerStats } from '@/lib/db/leaderboard'
import { leaderboardCache, playerStatsCache } from '@/lib/cache'

// Helper to create a mock NextRequest
function createMockRequest(searchParams?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/leaderboard')
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return new NextRequest(url, { method: 'GET' })
}

describe('Leaderboard API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(leaderboardCache.get).mockReturnValue(undefined)
    vi.mocked(playerStatsCache.get).mockReturnValue(undefined)
  })

  describe('GET /api/leaderboard', () => {
    it('should return leaderboard data with default pagination', async () => {
      const mockLeaderboard = [
        {
          player_id: 1,
          wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
          username: 'player1',
          total_points: 1000,
          total_checkins: 10,
          rank: 1,
        },
        {
          player_id: 2,
          wallet_address: '0xabcdef1234567890abcdef1234567890abcdef12',
          username: 'player2',
          total_points: 900,
          total_checkins: 9,
          rank: 2,
        },
      ]

      vi.mocked(getLeaderboard).mockResolvedValueOnce(mockLeaderboard)

      const request = createMockRequest()
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.leaderboard).toEqual(mockLeaderboard)
      expect(json.data.pagination).toBeDefined()
      expect(json.data.pagination.page).toBe(1)
      expect(json.data.pagination.limit).toBe(10) // Default limit
      expect(getLeaderboard).toHaveBeenCalledWith(10, 0) // Default limit=10, offset=0
    })

    it('should support custom limit parameter', async () => {
      const mockLeaderboard = [
        { player_id: 1, username: 'player1', total_points: 1000, rank: 1 },
      ]

      vi.mocked(getLeaderboard).mockResolvedValueOnce(mockLeaderboard)

      const request = createMockRequest({ limit: '10' })
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(getLeaderboard).toHaveBeenCalledWith(10, 0)
      expect(json.data.pagination.limit).toBe(10)
    })

    it('should support page-based pagination', async () => {
      const mockLeaderboard = []

      vi.mocked(getLeaderboard).mockResolvedValueOnce(mockLeaderboard)

      const request = createMockRequest({ page: '2', limit: '20' })
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(getLeaderboard).toHaveBeenCalledWith(20, 20) // offset = (2-1) * 20
      expect(json.data.pagination.page).toBe(2)
    })

    it('should support offset-based pagination', async () => {
      const mockLeaderboard = []

      vi.mocked(getLeaderboard).mockResolvedValueOnce(mockLeaderboard)

      const request = createMockRequest({ offset: '25', limit: '10' })
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(getLeaderboard).toHaveBeenCalledWith(10, 25)
    })

    it('should return cached leaderboard when available', async () => {
      const cachedLeaderboard = [
        { player_id: 1, username: 'cachedPlayer', total_points: 500, rank: 1 },
      ]

      vi.mocked(leaderboardCache.get).mockReturnValueOnce(cachedLeaderboard)

      const request = createMockRequest()
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.leaderboard).toEqual(cachedLeaderboard)
      expect(json.data.cached).toBe(true)
      expect(getLeaderboard).not.toHaveBeenCalled()
    })

    it('should cache leaderboard after fetching', async () => {
      const mockLeaderboard = [
        { player_id: 1, username: 'player1', total_points: 1000, rank: 1 },
      ]

      vi.mocked(getLeaderboard).mockResolvedValueOnce(mockLeaderboard)

      const request = createMockRequest()
      await GET(request)

      expect(leaderboardCache.set).toHaveBeenCalledWith(
        expect.stringContaining('leaderboard_'),
        mockLeaderboard
      )
    })

    it('should return player stats when playerId is provided', async () => {
      const mockPlayerStats = {
        rank: 42,
        total_points: 1500,
        total_checkins: 25,
      }

      vi.mocked(getPlayerStats).mockResolvedValueOnce(mockPlayerStats)

      const request = createMockRequest({ playerId: '123' })
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.playerStats).toEqual(mockPlayerStats)
      expect(getLeaderboard).not.toHaveBeenCalled()
    })

    it('should return cached player stats when available', async () => {
      const cachedStats = {
        rank: 10,
        total_points: 2000,
        total_checkins: 50,
      }

      vi.mocked(playerStatsCache.get).mockReturnValueOnce(cachedStats)

      const request = createMockRequest({ playerId: '456' })
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.playerStats).toEqual(cachedStats)
      expect(json.data.cached).toBe(true)
      expect(getPlayerStats).not.toHaveBeenCalled()
    })

    it('should cache player stats after fetching', async () => {
      const mockPlayerStats = {
        rank: 5,
        total_points: 3000,
      }

      vi.mocked(getPlayerStats).mockResolvedValueOnce(mockPlayerStats)

      const request = createMockRequest({ playerId: '789' })
      await GET(request)

      expect(playerStatsCache.set).toHaveBeenCalledWith(
        'player_stats_789',
        mockPlayerStats
      )
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(getLeaderboard).mockRejectedValueOnce(new Error('Database connection failed'))

      const request = createMockRequest()
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error).toBe('Failed to fetch leaderboard data')
    })

    it('should return empty leaderboard when no players', async () => {
      vi.mocked(getLeaderboard).mockResolvedValueOnce([])

      const request = createMockRequest()
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.leaderboard).toEqual([])
      expect(json.data.totalPlayers).toBe(0)
    })

    it('should include total count in pagination', async () => {
      const mockLeaderboard = [
        { player_id: 1, username: 'player1', total_points: 1000, rank: 1 },
      ]

      vi.mocked(getLeaderboard).mockResolvedValueOnce(mockLeaderboard)

      const request = createMockRequest({ page: '1', limit: '10' })
      const response = await GET(request)
      const json = await response.json()

      expect(json.data.pagination.total).toBeDefined()
      expect(json.data.pagination.totalPages).toBeDefined()
    })
  })
})

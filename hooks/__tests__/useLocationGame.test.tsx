import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useLocationGame } from '../useLocationGame'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { toast } from 'sonner'

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useLocationGame', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('performCheckin', () => {
    it('should successfully perform a checkin', async () => {
      const mockResponse = {
        success: true,
        checkin: { id: '123' },
        player: { id: '456', total_points: 100 },
        location: { id: '789', name: 'Test Location' },
        pointsEarned: 50,
        message: 'Check-in successful! You earned 50 points!',
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useLocationGame(), {
        wrapper: createWrapper(),
      })

      const checkinData = {
        walletAddress: '0x1234567890abcdef',
        locationData: {
          place_id: 'place-123',
          display_name: 'Test Location, Test City',
          lat: '40.7128',
          lon: '-74.0060',
        },
      }

      let response: any
      await act(async () => {
        response = await result.current.performCheckin(checkinData)
      })

      expect(response).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith('/api/location-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkinData),
      })
      expect(toast.success).toHaveBeenCalledWith('Check-in successful! You earned 50 points!')
    })

    it('should show default success message when no message provided', async () => {
      const mockResponse = {
        success: true,
        checkin: { id: '123' },
        player: { id: '456' },
        location: { id: '789' },
        pointsEarned: 25,
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useLocationGame(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.performCheckin({
          walletAddress: '0x1234',
          locationData: {
            place_id: 'place-1',
            display_name: 'Test',
            lat: '0',
            lon: '0',
          },
        })
      })

      expect(toast.success).toHaveBeenCalledWith('You earned 25 points!')
    })

    it('should handle already checked in error', async () => {
      const errorResponse = {
        success: false,
        error: 'Already checked in',
        alreadyCheckedIn: true,
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => errorResponse,
      } as Response)

      const { result } = renderHook(() => useLocationGame(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.performCheckin({
          walletAddress: '0x1234',
          locationData: {
            place_id: 'place-1',
            display_name: 'Test',
            lat: '0',
            lon: '0',
          },
        })
      })

      expect(toast.error).toHaveBeenCalledWith("You've already checked in at this location!")
    })

    it('should handle generic checkin error', async () => {
      const errorResponse = {
        success: false,
        error: 'Location not found',
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => errorResponse,
      } as Response)

      const { result } = renderHook(() => useLocationGame(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.performCheckin({
          walletAddress: '0x1234',
          locationData: {
            place_id: 'place-1',
            display_name: 'Test',
            lat: '0',
            lon: '0',
          },
        })
      })

      expect(toast.error).toHaveBeenCalledWith('Location not found')
    })

    it('should return null on error', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      } as Response)

      const { result } = renderHook(() => useLocationGame(), {
        wrapper: createWrapper(),
      })

      let response: any
      await act(async () => {
        response = await result.current.performCheckin({
          walletAddress: '0x1234',
          locationData: {
            place_id: 'place-1',
            display_name: 'Test',
            lat: '0',
            lon: '0',
          },
        })
      })

      expect(response).toBeNull()
    })
  })

  describe('Hook Return Value', () => {
    it('should expose performCheckin function', () => {
      const { result } = renderHook(() => useLocationGame(), {
        wrapper: createWrapper(),
      })

      expect(typeof result.current.performCheckin).toBe('function')
    })

    it('should expose isCheckinLoading state', () => {
      const { result } = renderHook(() => useLocationGame(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isCheckinLoading).toBe(false)
    })

    it('should expose useLeaderboard hook', () => {
      const { result } = renderHook(() => useLocationGame(), {
        wrapper: createWrapper(),
      })

      expect(typeof result.current.useLeaderboard).toBe('function')
    })

    it('should expose usePlayerStats hook', () => {
      const { result } = renderHook(() => useLocationGame(), {
        wrapper: createWrapper(),
      })

      expect(typeof result.current.usePlayerStats).toBe('function')
    })

    it('should expose usePlayerData hook', () => {
      const { result } = renderHook(() => useLocationGame(), {
        wrapper: createWrapper(),
      })

      expect(typeof result.current.usePlayerData).toBe('function')
    })

    it('should expose getPlayerData function', () => {
      const { result } = renderHook(() => useLocationGame(), {
        wrapper: createWrapper(),
      })

      expect(typeof result.current.getPlayerData).toBe('function')
    })

    it('should expose fetchLeaderboard function', () => {
      const { result } = renderHook(() => useLocationGame(), {
        wrapper: createWrapper(),
      })

      expect(typeof result.current.fetchLeaderboard).toBe('function')
    })

    it('should expose getPlayerStats function', () => {
      const { result } = renderHook(() => useLocationGame(), {
        wrapper: createWrapper(),
      })

      expect(typeof result.current.getPlayerStats).toBe('function')
    })
  })

  describe('useLeaderboard', () => {
    it('should fetch leaderboard data', async () => {
      const mockLeaderboard = [
        { player_id: 1, wallet_address: '0x123', total_points: 1000, rank: 1 },
        { player_id: 2, wallet_address: '0x456', total_points: 900, rank: 2 },
      ]

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ leaderboard: mockLeaderboard }),
      } as Response)

      const { result } = renderHook(
        () => {
          const game = useLocationGame()
          return game.useLeaderboard()
        },
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockLeaderboard)
      expect(global.fetch).toHaveBeenCalledWith('/api/leaderboard?limit=50')
    })

    it('should use custom limit', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ leaderboard: [] }),
      } as Response)

      const { result } = renderHook(
        () => {
          const game = useLocationGame()
          return game.useLeaderboard(100)
        },
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/leaderboard?limit=100')
    })
  })

  describe('usePlayerData', () => {
    it('should fetch player data when wallet address is provided', async () => {
      const mockPlayer = {
        id: '123',
        wallet_address: '0x1234567890abcdef',
        total_points: 500,
        total_checkins: 10,
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ player: mockPlayer }),
      } as Response)

      const { result } = renderHook(
        () => {
          const game = useLocationGame()
          return game.usePlayerData('0x1234567890abcdef')
        },
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockPlayer)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/location-checkin?walletAddress=0x1234567890abcdef'
      )
    })

    it('should not fetch when wallet address is undefined', () => {
      const { result } = renderHook(
        () => {
          const game = useLocationGame()
          return game.usePlayerData(undefined)
        },
        { wrapper: createWrapper() }
      )

      expect(result.current.fetchStatus).toBe('idle')
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('usePlayerStats', () => {
    it('should fetch player stats when player ID is provided', async () => {
      const mockStats = {
        rank: 42,
        total_points: 1500,
        total_checkins: 25,
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ playerStats: mockStats }),
      } as Response)

      const { result } = renderHook(
        () => {
          const game = useLocationGame()
          return game.usePlayerStats(123)
        },
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockStats)
      expect(global.fetch).toHaveBeenCalledWith('/api/leaderboard?playerId=123')
    })

    it('should not fetch when player ID is undefined', () => {
      const { result } = renderHook(
        () => {
          const game = useLocationGame()
          return game.usePlayerStats(undefined)
        },
        { wrapper: createWrapper() }
      )

      expect(result.current.fetchStatus).toBe('idle')
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })
})

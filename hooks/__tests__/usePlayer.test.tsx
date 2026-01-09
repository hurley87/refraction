import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCurrentPlayer, usePlayerRank, usePlayerActivities, useUserStats } from '../usePlayer'

// Mock Privy
const mockUsePrivy = vi.fn()
vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => mockUsePrivy(),
}))

// Mock apiClient
vi.mock('@/lib/api/client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '@/lib/api/client'

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('usePlayer hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('useCurrentPlayer', () => {
    it('should return null when no user is logged in', async () => {
      mockUsePrivy.mockReturnValue({ user: null })

      const { result } = renderHook(() => useCurrentPlayer(), {
        wrapper: createWrapper(),
      })

      expect(result.current.data).toBeUndefined()
      expect(result.current.isLoading).toBe(false)
    })

    it('should fetch player data when user is logged in', async () => {
      mockUsePrivy.mockReturnValue({
        user: { wallet: { address: '0x1234567890abcdef' } },
      })

      const mockPlayer = {
        id: '123',
        wallet_address: '0x1234567890abcdef',
        username: 'testuser',
        total_points: 1000,
      }

      vi.mocked(apiClient).mockResolvedValueOnce({ player: mockPlayer })

      const { result } = renderHook(() => useCurrentPlayer(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockPlayer)
      expect(apiClient).toHaveBeenCalledWith(
        '/api/player?walletAddress=0x1234567890abcdef'
      )
    })

    it('should not fetch when address is undefined', () => {
      mockUsePrivy.mockReturnValue({
        user: { wallet: null },
      })

      const { result } = renderHook(() => useCurrentPlayer(), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(apiClient).not.toHaveBeenCalled()
    })
  })

  describe('usePlayerRank', () => {
    it('should return null when no address is provided', async () => {
      const { result } = renderHook(() => usePlayerRank(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.data).toBeUndefined()
      expect(result.current.fetchStatus).toBe('idle')
    })

    it('should fetch player rank when address is provided', async () => {
      vi.mocked(apiClient).mockResolvedValueOnce({ rank: 42, total_points: 1000 })

      const { result } = renderHook(
        () => usePlayerRank('0x1234567890abcdef'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBe(42)
      expect(apiClient).toHaveBeenCalledWith(
        '/api/player/rank?walletAddress=0x1234567890abcdef'
      )
    })

    it('should handle null rank response', async () => {
      vi.mocked(apiClient).mockResolvedValueOnce({ rank: null, total_points: 0 })

      const { result } = renderHook(
        () => usePlayerRank('0x1234567890abcdef'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBe(null)
    })
  })

  describe('usePlayerActivities', () => {
    it('should return empty array when no address is provided', async () => {
      const { result } = renderHook(() => usePlayerActivities(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })

    it('should fetch activities when address is provided', async () => {
      const mockActivities = [
        {
          id: '1',
          date: '2024-01-01',
          description: 'Check-in at Location A',
          activityType: 'checkin',
          points: 100,
          event: 'checkin',
          metadata: {},
        },
        {
          id: '2',
          date: '2024-01-02',
          description: 'Daily reward',
          activityType: 'reward',
          points: 50,
          event: 'daily_reward',
          metadata: {},
        },
      ]

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockActivities,
      } as Response)

      const { result } = renderHook(
        () => usePlayerActivities('0x1234567890abcdef'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockActivities)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/activities?wallet_address=0x1234567890abcdef&limit=20'
      )
    })

    it('should use custom limit when provided', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response)

      const { result } = renderHook(
        () => usePlayerActivities('0x1234567890abcdef', 50),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/activities?wallet_address=0x1234567890abcdef&limit=50'
      )
    })

    it('should throw error when fetch fails', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      const { result } = renderHook(
        () => usePlayerActivities('0x1234567890abcdef'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeInstanceOf(Error)
      expect((result.current.error as Error).message).toBe('Failed to fetch activities')
    })
  })

  describe('useUserStats', () => {
    it('should return null when no address is available', async () => {
      mockUsePrivy.mockReturnValue({ user: null })

      const { result } = renderHook(() => useUserStats(), {
        wrapper: createWrapper(),
      })

      expect(result.current.userStats).toBe(null)
    })

    it('should use provided address over current user', async () => {
      mockUsePrivy.mockReturnValue({
        user: { wallet: { address: '0xCurrentUser' } },
      })

      vi.mocked(apiClient)
        .mockResolvedValueOnce({ player: { total_points: 500 } })
        .mockResolvedValueOnce({ rank: 10, total_points: 500 })

      const { result } = renderHook(
        () => useUserStats('0xOtherUser'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(apiClient).toHaveBeenCalledWith(
        '/api/player?walletAddress=0xOtherUser'
      )
    })

    it('should return combined stats when data is available', async () => {
      mockUsePrivy.mockReturnValue({
        user: { wallet: { address: '0x1234567890abcdef' } },
      })

      const mockPlayer = { total_points: 1500 }

      vi.mocked(apiClient)
        .mockResolvedValueOnce({ player: mockPlayer })
        .mockResolvedValueOnce({ rank: 42, total_points: 1500 })

      const { result } = renderHook(() => useUserStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.userStats).toEqual({
        rank: 42,
        total_points: 1500,
      })
    })

    it('should return default values when player data is not available', async () => {
      mockUsePrivy.mockReturnValue({
        user: { wallet: { address: '0x1234567890abcdef' } },
      })

      vi.mocked(apiClient)
        .mockResolvedValueOnce({ player: null })
        .mockResolvedValueOnce({ rank: null, total_points: 0 })

      const { result } = renderHook(() => useUserStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // New users get default values
      expect(result.current.userStats).toEqual({
        rank: 999,
        total_points: 0,
      })
    })

    it('should default rank to 999 when rank is null', async () => {
      mockUsePrivy.mockReturnValue({
        user: { wallet: { address: '0x1234567890abcdef' } },
      })

      vi.mocked(apiClient)
        .mockResolvedValueOnce({ player: { total_points: 100 } })
        .mockResolvedValueOnce({ rank: null, total_points: 100 })

      const { result } = renderHook(() => useUserStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.userStats?.rank).toBe(999)
    })
  })
})

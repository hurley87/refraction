import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCheckInStatus } from '../useCheckInStatus'

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

describe('useCheckInStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('Initial State', () => {
    it('should not fetch when address is empty', () => {
      const { result } = renderHook(
        () => useCheckInStatus('', 'checkpoint-1'),
        { wrapper: createWrapper() }
      )

      expect(result.current.checkinStatus).toBe(null)
      expect(result.current.checkpointCheckinToday).toBe(false)
      expect(result.current.dailyRewardClaimed).toBe(false)
      expect(result.current.pointsEarnedToday).toBe(0)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should not fetch when checkpoint is empty', () => {
      const { result } = renderHook(
        () => useCheckInStatus('0x1234567890abcdef', ''),
        { wrapper: createWrapper() }
      )

      expect(result.current.checkinStatus).toBe(null)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should not fetch when both address and checkpoint are empty', () => {
      const { result } = renderHook(
        () => useCheckInStatus('', ''),
        { wrapper: createWrapper() }
      )

      expect(result.current.fetchStatus).toBe('idle')
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('Fetching Status', () => {
    it('should fetch check-in status when address and checkpoint are provided', async () => {
      const mockResponse = {
        hasCheckedIn: true,
        checkpointCheckinToday: true,
        dailyRewardClaimed: false,
        pointsEarnedToday: 150,
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(
        () => useCheckInStatus('0x1234567890abcdef', 'checkpoint-abc'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.checkinStatus).toBe(true)
      expect(result.current.checkpointCheckinToday).toBe(true)
      expect(result.current.dailyRewardClaimed).toBe(false)
      expect(result.current.pointsEarnedToday).toBe(150)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/checkin-status?address=0x1234567890abcdef&checkpoint=checkpoint-abc'
      )
    })

    it('should return false when user has not checked in', async () => {
      const mockResponse = {
        hasCheckedIn: false,
        checkpointCheckinToday: false,
        dailyRewardClaimed: false,
        pointsEarnedToday: 0,
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(
        () => useCheckInStatus('0x1234', 'checkpoint-1'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.checkinStatus).toBe(false)
      expect(result.current.checkpointCheckinToday).toBe(false)
      expect(result.current.dailyRewardClaimed).toBe(false)
      expect(result.current.pointsEarnedToday).toBe(0)
    })

    it('should indicate daily reward claimed status', async () => {
      const mockResponse = {
        hasCheckedIn: true,
        checkpointCheckinToday: true,
        dailyRewardClaimed: true,
        pointsEarnedToday: 200,
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(
        () => useCheckInStatus('0x1234', 'checkpoint-1'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.dailyRewardClaimed).toBe(true)
      expect(result.current.pointsEarnedToday).toBe(200)
    })

    it('should URL-encode checkpoint parameter', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasCheckedIn: false,
          checkpointCheckinToday: false,
          dailyRewardClaimed: false,
          pointsEarnedToday: 0,
        }),
      } as Response)

      const { result } = renderHook(
        () => useCheckInStatus('0x1234', 'checkpoint with spaces & special/chars'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/checkin-status?address=0x1234&checkpoint=checkpoint%20with%20spaces%20%26%20special%2Fchars'
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle fetch error', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      const { result } = renderHook(
        () => useCheckInStatus('0x1234', 'checkpoint-1'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeInstanceOf(Error)
      expect((result.current.error as Error).message).toBe('Failed to fetch check-in status')
    })

    it('should return default values on error', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      const { result } = renderHook(
        () => useCheckInStatus('0x1234', 'checkpoint-1'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      // Default values should be maintained even on error
      expect(result.current.checkinStatus).toBe(null)
      expect(result.current.checkpointCheckinToday).toBe(false)
      expect(result.current.dailyRewardClaimed).toBe(false)
      expect(result.current.pointsEarnedToday).toBe(0)
    })

    it('should handle network error', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(
        () => useCheckInStatus('0x1234', 'checkpoint-1'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeInstanceOf(Error)
    })
  })

  describe('Loading State', () => {
    it('should show loading state while fetching', async () => {
      let resolvePromise: (value: Response) => void
      vi.mocked(global.fetch).mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePromise = resolve
        })
      )

      const { result } = renderHook(
        () => useCheckInStatus('0x1234', 'checkpoint-1'),
        { wrapper: createWrapper() }
      )

      expect(result.current.isLoading).toBe(true)

      resolvePromise!({
        ok: true,
        json: async () => ({
          hasCheckedIn: true,
          checkpointCheckinToday: false,
          dailyRewardClaimed: false,
          pointsEarnedToday: 0,
        }),
      } as Response)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  describe('Query Key', () => {
    it('should use correct query key with address and checkpoint', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          hasCheckedIn: false,
          checkpointCheckinToday: false,
          dailyRewardClaimed: false,
          pointsEarnedToday: 0,
        }),
      } as Response)

      // First render with one address/checkpoint
      const { result: result1, unmount } = renderHook(
        () => useCheckInStatus('0xAAA', 'checkpoint-A'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true)
      })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/checkin-status?address=0xAAA&checkpoint=checkpoint-A'
      )

      unmount()

      // Second render with different address/checkpoint - should make new request
      const { result: result2 } = renderHook(
        () => useCheckInStatus('0xBBB', 'checkpoint-B'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true)
      })

      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/checkin-status?address=0xBBB&checkpoint=checkpoint-B'
      )
    })
  })

  describe('Refetching', () => {
    it('should expose refetch function', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          hasCheckedIn: false,
          checkpointCheckinToday: false,
          dailyRewardClaimed: false,
          pointsEarnedToday: 0,
        }),
      } as Response)

      const { result } = renderHook(
        () => useCheckInStatus('0x1234', 'checkpoint-1'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(typeof result.current.refetch).toBe('function')
    })
  })
})

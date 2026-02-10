import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePerks, useAvailableCodesCount, useUserRedemptions } from '../usePerks'

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

describe('usePerks hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('usePerks', () => {
    it('should fetch active perks by default', async () => {
      const mockPerks = [
        {
          id: 'perk-1',
          title: 'Free Coffee',
          description: 'A free coffee at partner cafes',
          points_threshold: 100,
          type: 'discount',
          is_active: true,
        },
        {
          id: 'perk-2',
          title: 'VIP Access',
          description: 'VIP access to events',
          points_threshold: 500,
          type: 'access',
          is_active: true,
        },
      ]

      vi.mocked(apiClient).mockResolvedValueOnce({ perks: mockPerks })

      const { result } = renderHook(() => usePerks(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockPerks)
      expect(apiClient).toHaveBeenCalledWith('/api/perks?activeOnly=true')
    })

    it('should fetch all perks when activeOnly is false', async () => {
      const mockPerks = [
        {
          id: 'perk-1',
          title: 'Free Coffee',
          description: 'A free coffee',
          points_threshold: 100,
          type: 'discount',
          is_active: true,
        },
        {
          id: 'perk-3',
          title: 'Expired Perk',
          description: 'An expired perk',
          points_threshold: 200,
          type: 'discount',
          is_active: false,
        },
      ]

      vi.mocked(apiClient).mockResolvedValueOnce({ perks: mockPerks })

      const { result } = renderHook(() => usePerks(false), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockPerks)
      expect(apiClient).toHaveBeenCalledWith('/api/perks?activeOnly=false')
    })

    it('should handle empty perks list', async () => {
      vi.mocked(apiClient).mockResolvedValueOnce({ perks: [] })

      const { result } = renderHook(() => usePerks(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([])
    })

    it('should handle API error', async () => {
      vi.mocked(apiClient).mockRejectedValueOnce(new Error('Failed to fetch perks'))

      const { result } = renderHook(() => usePerks(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeInstanceOf(Error)
    })
  })

  describe('useAvailableCodesCount', () => {
    it('should not fetch when perkId is undefined', () => {
      const { result } = renderHook(() => useAvailableCodesCount(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(apiClient).not.toHaveBeenCalled()
    })

    it('should fetch available codes count when perkId is provided', async () => {
      vi.mocked(apiClient).mockResolvedValueOnce({ count: 15 })

      const { result } = renderHook(() => useAvailableCodesCount('perk-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBe(15)
      expect(apiClient).toHaveBeenCalledWith('/api/perks/perk-1/available-count')
    })

    it('should return zero count', async () => {
      vi.mocked(apiClient).mockResolvedValueOnce({ count: 0 })

      const { result } = renderHook(() => useAvailableCodesCount('perk-2'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBe(0)
    })

    it('should handle API error', async () => {
      vi.mocked(apiClient).mockRejectedValueOnce(new Error('Not found'))

      const { result } = renderHook(() => useAvailableCodesCount('perk-invalid'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeInstanceOf(Error)
    })
  })

  describe('useUserRedemptions', () => {
    it('should not fetch when address is undefined', () => {
      const { result } = renderHook(() => useUserRedemptions(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(apiClient).not.toHaveBeenCalled()
    })

    it('should fetch user redemptions when address is provided', async () => {
      const mockRedemptions = [
        {
          id: 'redemption-1',
          perk_id: 'perk-1',
          discount_code_id: 'code-1',
          user_wallet_address: '0x1234567890abcdef',
          redeemed_at: '2024-01-15T10:00:00Z',
          perk_discount_codes: { code: 'SAVE20' },
        },
        {
          id: 'redemption-2',
          perk_id: 'perk-2',
          discount_code_id: 'code-2',
          user_wallet_address: '0x1234567890abcdef',
          redeemed_at: '2024-01-20T14:00:00Z',
          perk_discount_codes: { code: 'VIP100' },
        },
      ]

      vi.mocked(apiClient).mockResolvedValueOnce({ redemptions: mockRedemptions })

      const { result } = renderHook(
        () => useUserRedemptions('0x1234567890abcdef'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockRedemptions)
      expect(apiClient).toHaveBeenCalledWith(
        '/api/user/redemptions?walletAddress=0x1234567890abcdef'
      )
    })

    it('should return empty array when no redemptions exist', async () => {
      vi.mocked(apiClient).mockResolvedValueOnce({ redemptions: [] })

      const { result } = renderHook(
        () => useUserRedemptions('0xNewUser'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([])
    })

    it('should URL-encode wallet address', async () => {
      vi.mocked(apiClient).mockResolvedValueOnce({ redemptions: [] })

      const { result } = renderHook(
        () => useUserRedemptions('0x1234567890abcdef'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(apiClient).toHaveBeenCalledWith(
        '/api/user/redemptions?walletAddress=0x1234567890abcdef'
      )
    })

    it('should handle API error', async () => {
      vi.mocked(apiClient).mockRejectedValueOnce(new Error('Unauthorized'))

      const { result } = renderHook(
        () => useUserRedemptions('0x1234567890abcdef'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeInstanceOf(Error)
    })
  })
})

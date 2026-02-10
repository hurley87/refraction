import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAptosWallet } from '../useAptosWallet'

// Mock Privy
const mockGetAccessToken = vi.fn().mockResolvedValue('mock-access-token')
const mockUsePrivy = vi.fn()
vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => mockUsePrivy(),
}))

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

describe('useAptosWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('Initial State', () => {
    it('should not fetch when user is not logged in', () => {
      mockUsePrivy.mockReturnValue({ user: null, getAccessToken: mockGetAccessToken })

      const { result } = renderHook(() => useAptosWallet(), {
        wrapper: createWrapper(),
      })

      expect(result.current.address).toBe(null)
      expect(result.current.isConnected).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should fetch wallet when user is logged in', async () => {
      mockUsePrivy.mockReturnValue({ user: { id: 'privy-user-123' }, getAccessToken: mockGetAccessToken })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { address: 'APTOS_ADDRESS_123', walletId: 'wallet-id-123' },
        }),
      } as Response)

      const { result } = renderHook(() => useAptosWallet(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.address).toBe('APTOS_ADDRESS_123')
      expect(result.current.walletId).toBe('wallet-id-123')
      expect(result.current.isConnected).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/aptos-wallet?privyUserId=privy-user-123',
        { headers: { Authorization: 'Bearer mock-access-token' } }
      )
    })

    it('should return null address when wallet does not exist', async () => {
      mockUsePrivy.mockReturnValue({ user: { id: 'privy-user-123' }, getAccessToken: mockGetAccessToken })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
        }),
      } as Response)

      const { result } = renderHook(() => useAptosWallet(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.address).toBe(null)
      expect(result.current.isConnected).toBe(false)
    })
  })

  describe('Connect (Create Wallet)', () => {
    it('should create a new wallet when connect is called', async () => {
      mockUsePrivy.mockReturnValue({ user: { id: 'privy-user-123' }, getAccessToken: mockGetAccessToken })

      // Initial fetch - no wallet
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false }),
      } as Response)

      const { result } = renderHook(() => useAptosWallet(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Create wallet call
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { address: 'NEW_APTOS_ADDRESS', walletId: 'new-wallet-id' },
        }),
      } as Response)

      let returnedAddress: string | undefined
      await act(async () => {
        returnedAddress = await result.current.connect()
      })

      expect(returnedAddress).toBe('NEW_APTOS_ADDRESS')

      await waitFor(() => {
        expect(result.current.address).toBe('NEW_APTOS_ADDRESS')
      })
      expect(result.current.isConnected).toBe(true)

      expect(global.fetch).toHaveBeenLastCalledWith('/api/aptos-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-access-token',
        },
        body: JSON.stringify({ privyUserId: 'privy-user-123' }),
      })
    })

    it('should throw error when connect is called without logged in user', async () => {
      mockUsePrivy.mockReturnValue({ user: null, getAccessToken: mockGetAccessToken })

      const { result } = renderHook(() => useAptosWallet(), {
        wrapper: createWrapper(),
      })

      await expect(result.current.connect()).rejects.toThrow('Please log in first')
    })

    it('should handle wallet creation error', async () => {
      mockUsePrivy.mockReturnValue({ user: { id: 'privy-user-123' }, getAccessToken: mockGetAccessToken })

      // Initial fetch
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false }),
      } as Response)

      const { result } = renderHook(() => useAptosWallet(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Failed create call
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Failed to create wallet',
        }),
      } as Response)

      await expect(act(async () => {
        await result.current.connect()
      })).rejects.toThrow('Failed to create wallet')
    })
  })

  describe('Disconnect', () => {
    it('should clear wallet data when disconnect is called', async () => {
      mockUsePrivy.mockReturnValue({ user: { id: 'privy-user-123' }, getAccessToken: mockGetAccessToken })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { address: 'APTOS_ADDRESS_123', walletId: 'wallet-id-123' },
        }),
      } as Response)

      const { result } = renderHook(() => useAptosWallet(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.address).toBe('APTOS_ADDRESS_123')
      })

      act(() => {
        result.current.disconnect()
      })

      await waitFor(() => {
        expect(result.current.address).toBe(null)
      })
      expect(result.current.isConnected).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle fetch rejection gracefully', async () => {
      mockUsePrivy.mockReturnValue({ user: { id: 'privy-user-123' }, getAccessToken: mockGetAccessToken })

      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useAptosWallet(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Network error')
    })

    it('should return null error when no errors exist', async () => {
      mockUsePrivy.mockReturnValue({ user: { id: 'privy-user-123' }, getAccessToken: mockGetAccessToken })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { address: 'APTOS_ADDRESS', walletId: 'wallet-id' },
        }),
      } as Response)

      const { result } = renderHook(() => useAptosWallet(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBeNull()
    })
  })
})

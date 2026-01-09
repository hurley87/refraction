import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useStellarWallet } from '../useStellarWallet'

// Mock Privy
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

describe('useStellarWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('Initial State', () => {
    it('should not fetch when user is not logged in', () => {
      mockUsePrivy.mockReturnValue({ user: null })

      const { result } = renderHook(() => useStellarWallet(), {
        wrapper: createWrapper(),
      })

      expect(result.current.address).toBe(null)
      expect(result.current.isConnected).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should fetch wallet when user is logged in', async () => {
      mockUsePrivy.mockReturnValue({ user: { id: 'privy-user-123' } })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          address: 'STELLAR_ADDRESS_123',
          walletId: 'wallet-id-123',
        }),
      } as Response)

      const { result } = renderHook(() => useStellarWallet(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.address).toBe('STELLAR_ADDRESS_123')
      expect(result.current.walletId).toBe('wallet-id-123')
      expect(result.current.isConnected).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/stellar-wallet?privyUserId=privy-user-123'
      )
    })

    it('should return null address when wallet does not exist', async () => {
      mockUsePrivy.mockReturnValue({ user: { id: 'privy-user-123' } })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
        }),
      } as Response)

      const { result } = renderHook(() => useStellarWallet(), {
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
      mockUsePrivy.mockReturnValue({ user: { id: 'privy-user-123' } })

      // Initial fetch - no wallet
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false }),
      } as Response)

      const { result } = renderHook(() => useStellarWallet(), {
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
          address: 'NEW_STELLAR_ADDRESS',
          walletId: 'new-wallet-id',
        }),
      } as Response)

      let returnedAddress: string | undefined
      await act(async () => {
        returnedAddress = await result.current.connect()
      })

      expect(returnedAddress).toBe('NEW_STELLAR_ADDRESS')

      // Wait for the mutation result to be reflected in state
      await waitFor(() => {
        expect(result.current.address).toBe('NEW_STELLAR_ADDRESS')
      })
      expect(result.current.isConnected).toBe(true)

      expect(global.fetch).toHaveBeenLastCalledWith('/api/stellar-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyUserId: 'privy-user-123' }),
      })
    })

    it('should throw error when connect is called without logged in user', async () => {
      mockUsePrivy.mockReturnValue({ user: null })

      const { result } = renderHook(() => useStellarWallet(), {
        wrapper: createWrapper(),
      })

      await expect(result.current.connect()).rejects.toThrow('Please log in first')
    })

    it('should handle wallet creation error', async () => {
      mockUsePrivy.mockReturnValue({ user: { id: 'privy-user-123' } })

      // Initial fetch
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false }),
      } as Response)

      const { result } = renderHook(() => useStellarWallet(), {
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
      mockUsePrivy.mockReturnValue({ user: { id: 'privy-user-123' } })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          address: 'STELLAR_ADDRESS_123',
          walletId: 'wallet-id-123',
        }),
      } as Response)

      const { result } = renderHook(() => useStellarWallet(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.address).toBe('STELLAR_ADDRESS_123')
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

  describe('Loading States', () => {
    it('should show isLoading while fetching initial wallet data', async () => {
      mockUsePrivy.mockReturnValue({ user: { id: 'privy-user-123' } })

      let resolveFetch: (value: Response) => void
      vi.mocked(global.fetch).mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve
        })
      )

      const { result } = renderHook(() => useStellarWallet(), {
        wrapper: createWrapper(),
      })

      // Initially loading
      expect(result.current.isLoading).toBe(true)

      // Resolve the fetch
      resolveFetch!({
        ok: true,
        json: async () => ({
          success: true,
          address: 'STELLAR_ADDRESS',
          walletId: 'wallet-id',
        }),
      } as Response)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.address).toBe('STELLAR_ADDRESS')
    })

    it('should return isConnecting state', async () => {
      mockUsePrivy.mockReturnValue({ user: { id: 'privy-user-123' } })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false }),
      } as Response)

      const { result } = renderHook(() => useStellarWallet(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Verify isConnecting is initially false
      expect(result.current.isConnecting).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle fetch rejection gracefully', async () => {
      mockUsePrivy.mockReturnValue({ user: { id: 'privy-user-123' } })

      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useStellarWallet(), {
        wrapper: createWrapper(),
      })

      // Wait for the query to finish (either success or error)
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Error should be set from the query error
      expect(result.current.error).toBe('Network error')
    })

    it('should throw error when mutation fails', async () => {
      mockUsePrivy.mockReturnValue({ user: { id: 'privy-user-123' } })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false }),
      } as Response)

      const { result } = renderHook(() => useStellarWallet(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Creation failed' }),
      } as Response)

      // The connect function should throw when mutation fails
      await expect(act(async () => {
        await result.current.connect()
      })).rejects.toThrow('Creation failed')
    })

    it('should return null error when no errors exist', async () => {
      mockUsePrivy.mockReturnValue({ user: { id: 'privy-user-123' } })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          address: 'STELLAR_ADDRESS',
          walletId: 'wallet-id',
        }),
      } as Response)

      const { result } = renderHook(() => useStellarWallet(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBeNull()
    })
  })
})

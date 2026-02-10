import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCheckins } from '../useCheckins'

// Mock the publicClient
const mockReadContract = vi.fn()
vi.mock('../../lib/publicClient', () => ({
  testPublicClient: {
    readContract: (...args: any[]) => mockReadContract(...args),
  },
}))

// Mock the checkin config
vi.mock('@/lib/checkin', () => ({
  checkinABI: [{ name: 'getUserCheckInCount', type: 'function' }],
  checkinAddress: '0xMockCheckinAddress',
}))

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

describe('useCheckins', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not fetch when address is empty', () => {
    const { result } = renderHook(() => useCheckins(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.checkins).toBe(0)
    expect(result.current.fetchStatus).toBe('idle')
    expect(mockReadContract).not.toHaveBeenCalled()
  })

  it('should fetch check-in count when address is provided', async () => {
    mockReadContract.mockResolvedValueOnce(BigInt(5))

    const { result } = renderHook(() => useCheckins('0x1234567890abcdef'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.checkins).toBe(5)
    expect(mockReadContract).toHaveBeenCalledWith({
      address: '0xMockCheckinAddress',
      abi: [{ name: 'getUserCheckInCount', type: 'function' }],
      functionName: 'getUserCheckInCount',
      args: ['0x1234567890abcdef'],
    })
  })

  it('should return zero when user has no check-ins', async () => {
    mockReadContract.mockResolvedValueOnce(BigInt(0))

    const { result } = renderHook(() => useCheckins('0x1234567890abcdef'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.checkins).toBe(0)
  })

  it('should convert BigInt response to number', async () => {
    mockReadContract.mockResolvedValueOnce(BigInt(42))

    const { result } = renderHook(() => useCheckins('0xABC'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.checkins).toBe(42)
    expect(typeof result.current.checkins).toBe('number')
  })

  it('should handle contract read error', async () => {
    mockReadContract.mockRejectedValueOnce(new Error('Contract call failed'))

    const { result } = renderHook(() => useCheckins('0x1234567890abcdef'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('should default checkins to 0 when data is not yet loaded', () => {
    mockReadContract.mockReturnValueOnce(new Promise(() => {})) // never resolves

    const { result } = renderHook(() => useCheckins('0x1234567890abcdef'), {
      wrapper: createWrapper(),
    })

    expect(result.current.checkins).toBe(0)
  })
})

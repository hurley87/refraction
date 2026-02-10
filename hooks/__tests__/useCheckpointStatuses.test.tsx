import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCheckpointStatuses } from '../useCheckpointStatuses'

// Mock the publicClient
const mockReadContract = vi.fn()
vi.mock('../../lib/publicClient', () => ({
  testPublicClient: {
    readContract: (...args: any[]) => mockReadContract(...args),
  },
}))

// Mock the checkin config
vi.mock('@/lib/checkin', () => ({
  checkinABI: [{ name: 'hasUserCheckedIn', type: 'function' }],
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

describe('useCheckpointStatuses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch statuses for all three checkpoints', async () => {
    // Mock three parallel readContract calls (one per checkpoint)
    mockReadContract
      .mockResolvedValueOnce(true)   // Checkpoint 1: checked in
      .mockResolvedValueOnce(false)  // Checkpoint 2: not checked in
      .mockResolvedValueOnce(true)   // Checkpoint 3: checked in

    const { result } = renderHook(
      () => useCheckpointStatuses('0x1234567890abcdef' as `0x${string}`),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual([
      { id: 1, name: 'Checkpoint 1', description: 'WalletCon', isCheckedIn: true },
      { id: 2, name: 'Checkpoint 2', description: 'ESP HiFi', isCheckedIn: false },
      { id: 3, name: 'Checkpoint 3', description: 'Syndicate Van', isCheckedIn: true },
    ])

    expect(mockReadContract).toHaveBeenCalledTimes(3)
  })

  it('should call readContract with correct args for each checkpoint', async () => {
    mockReadContract
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)

    const address = '0xABCDEF' as `0x${string}`

    const { result } = renderHook(
      () => useCheckpointStatuses(address),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockReadContract).toHaveBeenCalledWith({
      address: '0xMockCheckinAddress',
      abi: [{ name: 'hasUserCheckedIn', type: 'function' }],
      functionName: 'hasUserCheckedIn',
      args: [address, BigInt(1)],
    })

    expect(mockReadContract).toHaveBeenCalledWith({
      address: '0xMockCheckinAddress',
      abi: [{ name: 'hasUserCheckedIn', type: 'function' }],
      functionName: 'hasUserCheckedIn',
      args: [address, BigInt(2)],
    })

    expect(mockReadContract).toHaveBeenCalledWith({
      address: '0xMockCheckinAddress',
      abi: [{ name: 'hasUserCheckedIn', type: 'function' }],
      functionName: 'hasUserCheckedIn',
      args: [address, BigInt(3)],
    })
  })

  it('should return all checkpoints as not checked in when user has no checkins', async () => {
    mockReadContract
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)

    const { result } = renderHook(
      () => useCheckpointStatuses('0x1234' as `0x${string}`),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data!.every((cp) => cp.isCheckedIn === false)).toBe(true)
  })

  it('should return all checkpoints as checked in', async () => {
    mockReadContract
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)

    const { result } = renderHook(
      () => useCheckpointStatuses('0x1234' as `0x${string}`),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data!.every((cp) => cp.isCheckedIn === true)).toBe(true)
  })

  it('should handle contract read error', async () => {
    mockReadContract.mockRejectedValueOnce(new Error('Contract call reverted'))

    const { result } = renderHook(
      () => useCheckpointStatuses('0x1234' as `0x${string}`),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })
})

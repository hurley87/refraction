import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTiers } from '../useTiers'

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

describe('useTiers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch all tiers', async () => {
    const mockTiers = [
      {
        id: 'tier-1',
        title: 'Bronze',
        min_points: 0,
        max_points: 499,
        description: 'Starting tier',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'tier-2',
        title: 'Silver',
        min_points: 500,
        max_points: 1499,
        description: 'Mid-level tier',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'tier-3',
        title: 'Gold',
        min_points: 1500,
        max_points: null,
        description: 'Top tier with unlimited points',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]

    vi.mocked(apiClient).mockResolvedValueOnce({ tiers: mockTiers })

    const { result } = renderHook(() => useTiers(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockTiers)
    expect(apiClient).toHaveBeenCalledWith('/api/tiers')
  })

  it('should handle empty tiers list', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({ tiers: [] })

    const { result } = renderHook(() => useTiers(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual([])
  })

  it('should handle API error', async () => {
    vi.mocked(apiClient).mockRejectedValueOnce(new Error('Failed to fetch tiers'))

    const { result } = renderHook(() => useTiers(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect((result.current.error as Error).message).toBe('Failed to fetch tiers')
  })

  it('should show loading state while fetching', async () => {
    let resolvePromise: (value: { tiers: any[] }) => void
    vi.mocked(apiClient).mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve
      })
    )

    const { result } = renderHook(() => useTiers(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)

    resolvePromise!({ tiers: [] })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should return tiers with correct structure', async () => {
    const mockTiers = [
      {
        id: 'tier-1',
        title: 'Bronze',
        min_points: 0,
        max_points: 499,
        description: 'Starting tier',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]

    vi.mocked(apiClient).mockResolvedValueOnce({ tiers: mockTiers })

    const { result } = renderHook(() => useTiers(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const tier = result.current.data![0]
    expect(tier).toHaveProperty('id')
    expect(tier).toHaveProperty('title')
    expect(tier).toHaveProperty('min_points')
    expect(tier).toHaveProperty('max_points')
    expect(tier).toHaveProperty('description')
  })
})

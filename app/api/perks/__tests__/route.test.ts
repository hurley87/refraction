import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the supabase client with a chainable query builder
const mockOr = vi.fn()
const mockEqActive = vi.fn(() => ({ or: mockOr }))
const mockOrder = vi.fn(() => ({ eq: mockEqActive }))
const mockSelectQuery = vi.fn(() => ({ order: mockOrder }))
const mockSingle = vi.fn()
const mockSelectInsert = vi.fn(() => ({ single: mockSingle }))
const mockInsert = vi.fn(() => ({ select: mockSelectInsert }))
const mockFrom = vi.fn(() => ({
  select: mockSelectQuery,
  insert: mockInsert,
}))

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { GET, POST } from '../route'

// Helper to create a mock NextRequest with search params
function createMockGetRequest(searchParams?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/perks')
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return new NextRequest(url, { method: 'GET' })
}

function createMockPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/perks', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('Perks API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the chain so each test starts fresh
    mockFrom.mockReturnValue({
      select: mockSelectQuery,
      insert: mockInsert,
    })
    mockSelectQuery.mockReturnValue({ order: mockOrder })
    mockOrder.mockReturnValue({ eq: mockEqActive })
    mockEqActive.mockReturnValue({ or: mockOr })
    mockInsert.mockReturnValue({ select: mockSelectInsert })
    mockSelectInsert.mockReturnValue({ single: mockSingle })
  })

  describe('GET /api/perks', () => {
    it('should return active perks by default', async () => {
      const mockPerks = [
        {
          id: 'perk-1',
          title: 'Free Coffee',
          description: 'Get a free coffee',
          points_threshold: 100,
          type: 'discount',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'perk-2',
          title: 'VIP Access',
          description: 'VIP event access',
          points_threshold: 500,
          type: 'access',
          is_active: true,
          created_at: '2024-01-02T00:00:00Z',
        },
      ]

      mockOr.mockResolvedValueOnce({ data: mockPerks, error: null })

      const request = createMockGetRequest()
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.perks).toEqual(mockPerks)
      expect(mockFrom).toHaveBeenCalledWith('perks')
    })

    it('should return all perks when activeOnly=false', async () => {
      const allPerks = [
        { id: 'perk-1', title: 'Active Perk', is_active: true },
        { id: 'perk-2', title: 'Inactive Perk', is_active: false },
      ]

      // When activeOnly=false, the query does not call eq/or, so order resolves directly
      mockOrder.mockResolvedValueOnce({ data: allPerks, error: null })

      const request = createMockGetRequest({ activeOnly: 'false' })
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.perks).toEqual(allPerks)
    })

    it('should return empty array when no perks exist', async () => {
      mockOr.mockResolvedValueOnce({ data: null, error: null })

      const request = createMockGetRequest()
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.perks).toEqual([])
    })

    it('should return 500 on database error', async () => {
      mockOr.mockResolvedValueOnce({
        data: null,
        error: { message: 'DB connection failed' },
      })

      const request = createMockGetRequest()
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error).toBe('Failed to fetch perks')
    })

    it('should return 500 when supabase throws', async () => {
      mockOr.mockRejectedValueOnce(new Error('Unexpected error'))

      const request = createMockGetRequest()
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error).toBe('Failed to fetch perks')
    })
  })

  describe('POST /api/perks', () => {
    it('should create a perk successfully', async () => {
      const newPerk = {
        title: 'New Perk',
        description: 'A brand new perk',
        points_threshold: 200,
        type: 'discount',
        is_active: true,
      }
      const createdPerk = {
        id: 'perk-new',
        ...newPerk,
        created_at: '2024-01-01T00:00:00Z',
      }

      mockSingle.mockResolvedValueOnce({ data: createdPerk, error: null })

      const request = createMockPostRequest(newPerk)
      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.perk).toEqual(createdPerk)
      expect(mockFrom).toHaveBeenCalledWith('perks')
    })

    it('should return 500 on database error during creation', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' },
      })

      const request = createMockPostRequest({
        title: 'Perk',
        description: 'desc',
        points_threshold: 100,
        type: 'discount',
      })
      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error).toBe('Failed to create perk')
    })

    it('should return 500 when insert throws', async () => {
      mockSingle.mockRejectedValueOnce(new Error('Unexpected insert error'))

      const request = createMockPostRequest({
        title: 'Perk',
        description: 'desc',
        points_threshold: 100,
        type: 'discount',
      })
      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error).toBe('Failed to create perk')
    })
  })
})

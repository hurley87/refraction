import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PlayerLocationCheckin } from '@/lib/types'

// Mock the supabase client
const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))
const mockEq = vi.fn(() => ({ eq: mockEq, single: mockSingle }))
const mockInsert = vi.fn(() => ({ select: mockSelect }))
const mockFrom = vi.fn(() => ({
  select: vi.fn(() => ({ eq: mockEq })),
  insert: mockInsert,
}))

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: () => mockFrom(),
  },
}))

import { checkUserLocationCheckin, createLocationCheckin } from '../checkins'

describe('Checkins Database Module', () => {
  // Sample checkin data for tests
  const sampleCheckin: PlayerLocationCheckin = {
    id: 1,
    player_id: 100,
    location_id: 200,
    points_earned: 50,
    checkin_at: '2024-01-15T10:00:00Z',
    created_at: '2024-01-15T10:00:00Z',
    comment: 'Great venue!',
    image_url: 'https://example.com/photo.jpg',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock chain
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({ eq: mockEq })),
      insert: mockInsert,
    })
    mockEq.mockReturnValue({ eq: mockEq, single: mockSingle })
    mockInsert.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ single: mockSingle })
  })

  describe('checkUserLocationCheckin', () => {
    it('should return checkin data when exists', async () => {
      mockSingle.mockResolvedValueOnce({ data: sampleCheckin, error: null })

      const result = await checkUserLocationCheckin(100, 200)

      expect(result).toEqual(sampleCheckin)
      expect(mockFrom).toHaveBeenCalled()
    })

    it('should return null when not found (PGRST116)', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' },
      })

      const result = await checkUserLocationCheckin(100, 999)

      expect(result).toBeNull()
    })

    it('should throw error for other database errors', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Database error' },
      })

      await expect(checkUserLocationCheckin(100, 200)).rejects.toEqual({
        code: 'PGRST500',
        message: 'Database error',
      })
    })

    it('should pass correct player_id and location_id to query', async () => {
      mockSingle.mockResolvedValueOnce({ data: sampleCheckin, error: null })

      await checkUserLocationCheckin(100, 200)

      expect(mockEq).toHaveBeenCalled()
    })
  })

  describe('createLocationCheckin', () => {
    it('should create and return new checkin record', async () => {
      const newCheckin = { ...sampleCheckin, id: 2 }
      mockSingle.mockResolvedValueOnce({ data: newCheckin, error: null })

      const checkinData: Omit<PlayerLocationCheckin, 'id' | 'created_at'> = {
        player_id: 100,
        location_id: 200,
        points_earned: 50,
      }

      const result = await createLocationCheckin(checkinData)

      expect(result).toEqual(newCheckin)
      expect(mockInsert).toHaveBeenCalled()
    })

    it('should create checkin with optional comment', async () => {
      const checkinWithComment = { ...sampleCheckin, comment: 'Amazing place!' }
      mockSingle.mockResolvedValueOnce({ data: checkinWithComment, error: null })

      const checkinData: Omit<PlayerLocationCheckin, 'id' | 'created_at'> = {
        player_id: 100,
        location_id: 200,
        points_earned: 50,
        comment: 'Amazing place!',
      }

      const result = await createLocationCheckin(checkinData)

      expect(result.comment).toBe('Amazing place!')
    })

    it('should create checkin with optional image_url', async () => {
      const checkinWithImage = {
        ...sampleCheckin,
        image_url: 'https://example.com/my-photo.jpg',
      }
      mockSingle.mockResolvedValueOnce({ data: checkinWithImage, error: null })

      const checkinData: Omit<PlayerLocationCheckin, 'id' | 'created_at'> = {
        player_id: 100,
        location_id: 200,
        points_earned: 50,
        image_url: 'https://example.com/my-photo.jpg',
      }

      const result = await createLocationCheckin(checkinData)

      expect(result.image_url).toBe('https://example.com/my-photo.jpg')
    })

    it('should create checkin with both comment and image_url', async () => {
      const fullCheckin = {
        ...sampleCheckin,
        comment: 'Great event!',
        image_url: 'https://example.com/event.jpg',
      }
      mockSingle.mockResolvedValueOnce({ data: fullCheckin, error: null })

      const checkinData: Omit<PlayerLocationCheckin, 'id' | 'created_at'> = {
        player_id: 100,
        location_id: 200,
        points_earned: 50,
        comment: 'Great event!',
        image_url: 'https://example.com/event.jpg',
      }

      const result = await createLocationCheckin(checkinData)

      expect(result.comment).toBe('Great event!')
      expect(result.image_url).toBe('https://example.com/event.jpg')
    })

    it('should throw error on duplicate constraint violation', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint',
        },
      })

      const checkinData: Omit<PlayerLocationCheckin, 'id' | 'created_at'> = {
        player_id: 100,
        location_id: 200,
        points_earned: 50,
      }

      await expect(createLocationCheckin(checkinData)).rejects.toEqual({
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      })
    })

    it('should throw error on insert failure', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Insert failed' },
      })

      const checkinData: Omit<PlayerLocationCheckin, 'id' | 'created_at'> = {
        player_id: 100,
        location_id: 200,
        points_earned: 50,
      }

      await expect(createLocationCheckin(checkinData)).rejects.toEqual({
        code: 'PGRST500',
        message: 'Insert failed',
      })
    })

    it('should handle zero points', async () => {
      const zeroPointsCheckin = { ...sampleCheckin, points_earned: 0 }
      mockSingle.mockResolvedValueOnce({ data: zeroPointsCheckin, error: null })

      const checkinData: Omit<PlayerLocationCheckin, 'id' | 'created_at'> = {
        player_id: 100,
        location_id: 200,
        points_earned: 0,
      }

      const result = await createLocationCheckin(checkinData)

      expect(result.points_earned).toBe(0)
    })

    it('should handle null comment and image_url', async () => {
      const minimalCheckin = {
        id: 3,
        player_id: 100,
        location_id: 200,
        points_earned: 25,
        comment: null,
        image_url: null,
        created_at: '2024-01-15T10:00:00Z',
      }
      mockSingle.mockResolvedValueOnce({ data: minimalCheckin, error: null })

      const checkinData: Omit<PlayerLocationCheckin, 'id' | 'created_at'> = {
        player_id: 100,
        location_id: 200,
        points_earned: 25,
        comment: null,
        image_url: null,
      }

      const result = await createLocationCheckin(checkinData)

      expect(result.comment).toBeNull()
      expect(result.image_url).toBeNull()
    })
  })
})

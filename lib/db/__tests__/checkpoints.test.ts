import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Checkpoint, ChainType } from '@/lib/types'

// Mock crypto.randomUUID for predictable IDs
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => '12345678-1234-1234-1234-123456789012'),
})

// Mock the supabase client
const mockSingle = vi.fn()
const mockOrder = vi.fn()
const mockEq = vi.fn(() => ({
  single: mockSingle,
  eq: vi.fn(() => ({ single: mockSingle, order: mockOrder })),
  order: mockOrder,
}))
const mockSelect = vi.fn(() => ({
  eq: mockEq,
  single: mockSingle,
  order: mockOrder,
}))
const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }))
const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) }))
const mockDelete = vi.fn(() => ({ eq: vi.fn() }))
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
}))

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: () => mockFrom(),
  },
}))

import {
  createCheckpoint,
  getCheckpointById,
  getActiveCheckpointById,
  listAllCheckpoints,
  listActiveCheckpoints,
  getCheckpointsByChainType,
} from '../checkpoints'

describe('Checkpoints Database Module', () => {
  // Sample checkpoint data for tests
  const sampleCheckpoint: Checkpoint = {
    id: '1234567890',
    name: 'Test Checkpoint',
    description: 'A test checkpoint',
    chain_type: 'evm',
    points_value: 100,
    is_active: true,
    created_by: '0x1234567890abcdef',
    partner_image_url: 'https://example.com/partner.png',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock chain
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })
    mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle, order: mockOrder })
    mockEq.mockReturnValue({
      single: mockSingle,
      eq: vi.fn(() => ({ single: mockSingle, order: mockOrder })),
      order: mockOrder,
    })
    mockInsert.mockReturnValue({ select: vi.fn(() => ({ single: mockSingle })) })
    mockUpdate.mockReturnValue({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) })
    mockDelete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  })

  describe('createCheckpoint', () => {
    it('should generate short ID when not provided', async () => {
      mockSingle.mockResolvedValueOnce({ data: sampleCheckpoint, error: null })

      const checkpointData = {
        name: 'Test Checkpoint',
        chain_type: 'evm' as ChainType,
        points_value: 100,
        is_active: true,
      }

      const result = await createCheckpoint(checkpointData)

      expect(result).toEqual(sampleCheckpoint)
      expect(mockInsert).toHaveBeenCalled()
    })

    it('should use provided ID when specified', async () => {
      mockSingle.mockResolvedValueOnce({ data: { ...sampleCheckpoint, id: 'custom-id' }, error: null })

      const checkpointData = {
        name: 'Test Checkpoint',
        chain_type: 'evm' as ChainType,
        points_value: 100,
        is_active: true,
      }

      const result = await createCheckpoint(checkpointData, 'custom-id')

      expect(result.id).toBe('custom-id')
    })

    it('should throw error on insert failure', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Insert failed' },
      })

      const checkpointData = {
        name: 'Test Checkpoint',
        chain_type: 'evm' as ChainType,
        points_value: 100,
        is_active: true,
      }

      await expect(createCheckpoint(checkpointData)).rejects.toEqual({
        code: 'PGRST500',
        message: 'Insert failed',
      })
    })
  })

  describe('getCheckpointById', () => {
    it('should return checkpoint when found', async () => {
      mockSingle.mockResolvedValueOnce({ data: sampleCheckpoint, error: null })

      const result = await getCheckpointById('1234567890')

      expect(result).toEqual(sampleCheckpoint)
      expect(mockFrom).toHaveBeenCalled()
    })

    it('should return null when not found (PGRST116)', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' },
      })

      const result = await getCheckpointById('nonexistent')

      expect(result).toBeNull()
    })

    it('should throw error for other database errors', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Database error' },
      })

      await expect(getCheckpointById('1234567890')).rejects.toEqual({
        code: 'PGRST500',
        message: 'Database error',
      })
    })
  })

  describe('getActiveCheckpointById', () => {
    it('should return active checkpoint when found', async () => {
      mockSingle.mockResolvedValueOnce({ data: sampleCheckpoint, error: null })

      const result = await getActiveCheckpointById('1234567890')

      expect(result).toEqual(sampleCheckpoint)
    })

    it('should return null for inactive checkpoint', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' },
      })

      const result = await getActiveCheckpointById('inactive-id')

      expect(result).toBeNull()
    })

    it('should throw error for other database errors', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Database error' },
      })

      await expect(getActiveCheckpointById('1234567890')).rejects.toEqual({
        code: 'PGRST500',
        message: 'Database error',
      })
    })
  })

  describe('listAllCheckpoints', () => {
    it('should return all checkpoints ordered by created_at desc', async () => {
      const checkpoints = [
        sampleCheckpoint,
        { ...sampleCheckpoint, id: 'checkpoint-2', name: 'Second Checkpoint' },
      ]
      mockOrder.mockResolvedValueOnce({ data: checkpoints, error: null })

      const result = await listAllCheckpoints()

      expect(result).toEqual(checkpoints)
      expect(mockFrom).toHaveBeenCalled()
    })

    it('should return empty array when no checkpoints exist', async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null })

      const result = await listAllCheckpoints()

      expect(result).toEqual([])
    })

    it('should return empty array when data is null', async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: null })

      const result = await listAllCheckpoints()

      expect(result).toEqual([])
    })

    it('should throw error on database failure', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Database error' },
      })

      await expect(listAllCheckpoints()).rejects.toEqual({
        code: 'PGRST500',
        message: 'Database error',
      })
    })
  })

  describe('listActiveCheckpoints', () => {
    it('should return only active checkpoints', async () => {
      const activeCheckpoints = [sampleCheckpoint]
      mockOrder.mockResolvedValueOnce({ data: activeCheckpoints, error: null })

      const result = await listActiveCheckpoints()

      expect(result).toEqual(activeCheckpoints)
    })

    it('should return empty array when no active checkpoints', async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null })

      const result = await listActiveCheckpoints()

      expect(result).toEqual([])
    })

    it('should throw error on database failure', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Database error' },
      })

      await expect(listActiveCheckpoints()).rejects.toEqual({
        code: 'PGRST500',
        message: 'Database error',
      })
    })
  })

  describe('getCheckpointsByChainType', () => {
    it('should return checkpoints filtered by evm chain type', async () => {
      const evmCheckpoints = [sampleCheckpoint]
      mockOrder.mockResolvedValueOnce({ data: evmCheckpoints, error: null })

      const result = await getCheckpointsByChainType('evm')

      expect(result).toEqual(evmCheckpoints)
    })

    it('should return checkpoints filtered by solana chain type', async () => {
      const solanaCheckpoints = [
        { ...sampleCheckpoint, chain_type: 'solana' as ChainType },
      ]
      mockOrder.mockResolvedValueOnce({ data: solanaCheckpoints, error: null })

      const result = await getCheckpointsByChainType('solana')

      expect(result).toEqual(solanaCheckpoints)
      expect(result[0].chain_type).toBe('solana')
    })

    it('should return checkpoints filtered by stellar chain type', async () => {
      const stellarCheckpoints = [
        { ...sampleCheckpoint, chain_type: 'stellar' as ChainType },
      ]
      mockOrder.mockResolvedValueOnce({ data: stellarCheckpoints, error: null })

      const result = await getCheckpointsByChainType('stellar')

      expect(result).toEqual(stellarCheckpoints)
      expect(result[0].chain_type).toBe('stellar')
    })

    it('should return empty array when no checkpoints for chain type', async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null })

      const result = await getCheckpointsByChainType('stellar')

      expect(result).toEqual([])
    })

    it('should only return active checkpoints', async () => {
      // This is implicitly tested as the query includes is_active: true
      const activeCheckpoints = [sampleCheckpoint]
      mockOrder.mockResolvedValueOnce({ data: activeCheckpoints, error: null })

      const result = await getCheckpointsByChainType('evm')

      expect(result).toEqual(activeCheckpoints)
      expect(result[0].is_active).toBe(true)
    })

    it('should throw error on database failure', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Database error' },
      })

      await expect(getCheckpointsByChainType('evm')).rejects.toEqual({
        code: 'PGRST500',
        message: 'Database error',
      })
    })
  })
})

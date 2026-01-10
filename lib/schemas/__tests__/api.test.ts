import { describe, it, expect } from 'vitest'
import {
  paginationSchema,
  checkinRequestSchema,
  leaderboardQuerySchema,
  redeemPerkRequestSchema,
  locationCheckinRequestSchema,
  createPlayerRequestSchema,
  getPlayerRequestSchema,
  updatePlayerRequestSchema,
  contactRequestSchema,
  newsletterRequestSchema,
  locationCommentRequestSchema,
  locationCommentsQuerySchema,
  chainTypeSchema,
  createCheckpointRequestSchema,
  updateCheckpointRequestSchema,
} from '../api'

describe('API Schemas', () => {
  describe('paginationSchema', () => {
    it('should accept valid pagination params', () => {
      const result = paginationSchema.safeParse({ limit: 20, offset: 10 })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(20)
        expect(result.data.offset).toBe(10)
      }
    })

    it('should use default values when not provided', () => {
      const result = paginationSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(10)
        expect(result.data.offset).toBe(0)
      }
    })

    it('should coerce string values to numbers', () => {
      const result = paginationSchema.safeParse({ limit: '50', offset: '5' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(50)
        expect(result.data.offset).toBe(5)
      }
    })

    it('should accept optional page parameter', () => {
      const result = paginationSchema.safeParse({ page: 2 })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(2)
      }
    })

    it('should reject limit below minimum (1)', () => {
      const result = paginationSchema.safeParse({ limit: 0 })
      expect(result.success).toBe(false)
    })

    it('should reject limit above maximum (100)', () => {
      const result = paginationSchema.safeParse({ limit: 101 })
      expect(result.success).toBe(false)
    })

    it('should reject negative offset', () => {
      const result = paginationSchema.safeParse({ offset: -1 })
      expect(result.success).toBe(false)
    })

    it('should reject non-integer page', () => {
      const result = paginationSchema.safeParse({ page: 1.5 })
      expect(result.success).toBe(false)
    })

    it('should reject page less than 1', () => {
      const result = paginationSchema.safeParse({ page: 0 })
      expect(result.success).toBe(false)
    })

    it('should accept boundary values', () => {
      expect(paginationSchema.safeParse({ limit: 1 }).success).toBe(true)
      expect(paginationSchema.safeParse({ limit: 100 }).success).toBe(true)
      expect(paginationSchema.safeParse({ offset: 0 }).success).toBe(true)
    })
  })

  describe('checkinRequestSchema', () => {
    it('should accept valid checkin request', () => {
      const validRequest = {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: 'checkpoint-123',
      }
      const result = checkinRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should accept checkin with optional email', () => {
      const validRequest = {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: 'checkpoint-123',
        email: 'test@example.com',
      }
      const result = checkinRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should reject missing walletAddress', () => {
      const invalidRequest = {
        checkpoint: 'checkpoint-123',
      }
      const result = checkinRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should reject invalid walletAddress', () => {
      const invalidRequest = {
        walletAddress: 'invalid-address',
        checkpoint: 'checkpoint-123',
      }
      const result = checkinRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should reject missing checkpoint', () => {
      const invalidRequest = {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      }
      const result = checkinRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should reject empty checkpoint', () => {
      const invalidRequest = {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: '',
      }
      const result = checkinRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should reject invalid email format', () => {
      const invalidRequest = {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: 'checkpoint-123',
        email: 'not-an-email',
      }
      const result = checkinRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })
  })

  describe('leaderboardQuerySchema', () => {
    it('should accept valid leaderboard query', () => {
      const result = leaderboardQuerySchema.safeParse({
        limit: 25,
        offset: 0,
        playerId: 123,
      })
      expect(result.success).toBe(true)
    })

    it('should use pagination defaults', () => {
      const result = leaderboardQuerySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(10)
        expect(result.data.offset).toBe(0)
      }
    })

    it('should coerce playerId from string', () => {
      const result = leaderboardQuerySchema.safeParse({ playerId: '42' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.playerId).toBe(42)
      }
    })

    it('should reject non-positive playerId', () => {
      expect(leaderboardQuerySchema.safeParse({ playerId: 0 }).success).toBe(false)
      expect(leaderboardQuerySchema.safeParse({ playerId: -1 }).success).toBe(false)
    })
  })

  describe('redeemPerkRequestSchema', () => {
    it('should accept valid redemption request', () => {
      const validRequest = {
        perkId: '550e8400-e29b-41d4-a716-446655440000',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      }
      const result = redeemPerkRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should reject missing perkId', () => {
      const invalidRequest = {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      }
      const result = redeemPerkRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should reject invalid perkId (not UUID)', () => {
      const invalidRequest = {
        perkId: 'not-a-uuid',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      }
      const result = redeemPerkRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should reject missing walletAddress', () => {
      const invalidRequest = {
        perkId: '550e8400-e29b-41d4-a716-446655440000',
      }
      const result = redeemPerkRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should reject invalid walletAddress', () => {
      const invalidRequest = {
        perkId: '550e8400-e29b-41d4-a716-446655440000',
        walletAddress: 'invalid',
      }
      const result = redeemPerkRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })
  })

  describe('locationCheckinRequestSchema', () => {
    it('should accept valid location checkin', () => {
      const validRequest = {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        locationId: 123,
      }
      const result = locationCheckinRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should accept with optional comment and imageUrl', () => {
      const validRequest = {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        locationId: 123,
        comment: 'Great place!',
        imageUrl: 'https://example.com/image.jpg',
      }
      const result = locationCheckinRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should coerce locationId from string', () => {
      const result = locationCheckinRequestSchema.safeParse({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        locationId: '456',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.locationId).toBe(456)
      }
    })

    it('should reject non-positive locationId', () => {
      expect(locationCheckinRequestSchema.safeParse({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        locationId: 0,
      }).success).toBe(false)
    })

    it('should reject comment over 500 characters', () => {
      const result = locationCheckinRequestSchema.safeParse({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        locationId: 123,
        comment: 'a'.repeat(501),
      })
      expect(result.success).toBe(false)
    })

    it('should accept comment at max length (500)', () => {
      const result = locationCheckinRequestSchema.safeParse({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        locationId: 123,
        comment: 'a'.repeat(500),
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid imageUrl', () => {
      const result = locationCheckinRequestSchema.safeParse({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        locationId: 123,
        imageUrl: 'not-a-url',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('createPlayerRequestSchema', () => {
    it('should accept valid create player request', () => {
      const validRequest = {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'testuser',
      }
      const result = createPlayerRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should accept with optional email', () => {
      const validRequest = {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'testuser',
        email: 'test@example.com',
      }
      const result = createPlayerRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should reject empty username', () => {
      const result = createPlayerRequestSchema.safeParse({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        username: '',
      })
      expect(result.success).toBe(false)
    })

    it('should reject username over 30 characters', () => {
      const result = createPlayerRequestSchema.safeParse({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'a'.repeat(31),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('getPlayerRequestSchema', () => {
    it('should accept valid wallet address', () => {
      const result = getPlayerRequestSchema.safeParse({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      })
      expect(result.success).toBe(true)
    })

    it('should reject missing walletAddress', () => {
      const result = getPlayerRequestSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('updatePlayerRequestSchema', () => {
    it('should accept valid update request', () => {
      const result = updatePlayerRequestSchema.safeParse({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'newusername',
      })
      expect(result.success).toBe(true)
    })

    it('should reject missing username', () => {
      const result = updatePlayerRequestSchema.safeParse({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('contactRequestSchema', () => {
    it('should accept valid contact request', () => {
      const result = contactRequestSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello, I have a question.',
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty name', () => {
      const result = contactRequestSchema.safeParse({
        name: '',
        email: 'john@example.com',
        message: 'Hello',
      })
      expect(result.success).toBe(false)
    })

    it('should reject name over 100 characters', () => {
      const result = contactRequestSchema.safeParse({
        name: 'a'.repeat(101),
        email: 'john@example.com',
        message: 'Hello',
      })
      expect(result.success).toBe(false)
    })

    it('should reject message over 2000 characters', () => {
      const result = contactRequestSchema.safeParse({
        name: 'John',
        email: 'john@example.com',
        message: 'a'.repeat(2001),
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty message', () => {
      const result = contactRequestSchema.safeParse({
        name: 'John',
        email: 'john@example.com',
        message: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('newsletterRequestSchema', () => {
    it('should accept valid email', () => {
      const result = newsletterRequestSchema.safeParse({ email: 'test@example.com' })
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const result = newsletterRequestSchema.safeParse({ email: 'not-an-email' })
      expect(result.success).toBe(false)
    })

    it('should reject missing email', () => {
      const result = newsletterRequestSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('locationCommentRequestSchema', () => {
    it('should accept valid comment request', () => {
      const result = locationCommentRequestSchema.safeParse({
        locationId: 123,
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        comment: 'Great place!',
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty comment', () => {
      const result = locationCommentRequestSchema.safeParse({
        locationId: 123,
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        comment: '',
      })
      expect(result.success).toBe(false)
    })

    it('should reject comment over 500 characters', () => {
      const result = locationCommentRequestSchema.safeParse({
        locationId: 123,
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        comment: 'a'.repeat(501),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('locationCommentsQuerySchema', () => {
    it('should accept valid locationId', () => {
      const result = locationCommentsQuerySchema.safeParse({ locationId: 123 })
      expect(result.success).toBe(true)
    })

    it('should coerce locationId from string', () => {
      const result = locationCommentsQuerySchema.safeParse({ locationId: '456' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.locationId).toBe(456)
      }
    })

    it('should reject non-positive locationId', () => {
      expect(locationCommentsQuerySchema.safeParse({ locationId: 0 }).success).toBe(false)
      expect(locationCommentsQuerySchema.safeParse({ locationId: -1 }).success).toBe(false)
    })
  })

  describe('chainTypeSchema', () => {
    it('should accept valid chain types', () => {
      expect(chainTypeSchema.safeParse('evm').success).toBe(true)
      expect(chainTypeSchema.safeParse('solana').success).toBe(true)
      expect(chainTypeSchema.safeParse('stellar').success).toBe(true)
    })

    it('should reject invalid chain types', () => {
      expect(chainTypeSchema.safeParse('bitcoin').success).toBe(false)
      expect(chainTypeSchema.safeParse('ethereum').success).toBe(false)
      expect(chainTypeSchema.safeParse('').success).toBe(false)
    })
  })

  describe('createCheckpointRequestSchema', () => {
    it('should accept valid checkpoint creation', () => {
      const validRequest = {
        name: 'Test Checkpoint',
        chain_type: 'evm',
      }
      const result = createCheckpointRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.points_value).toBe(100) // default
        expect(result.data.is_active).toBe(true) // default
      }
    })

    it('should accept all optional fields', () => {
      const validRequest = {
        name: 'Test Checkpoint',
        description: 'A test checkpoint',
        chain_type: 'solana',
        points_value: 500,
        is_active: false,
        partner_image_url: 'https://example.com/image.jpg',
      }
      const result = createCheckpointRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should reject empty name', () => {
      const result = createCheckpointRequestSchema.safeParse({
        name: '',
        chain_type: 'evm',
      })
      expect(result.success).toBe(false)
    })

    it('should reject name over 255 characters', () => {
      const result = createCheckpointRequestSchema.safeParse({
        name: 'a'.repeat(256),
        chain_type: 'evm',
      })
      expect(result.success).toBe(false)
    })

    it('should reject description over 1000 characters', () => {
      const result = createCheckpointRequestSchema.safeParse({
        name: 'Test',
        description: 'a'.repeat(1001),
        chain_type: 'evm',
      })
      expect(result.success).toBe(false)
    })

    it('should reject points_value below 1', () => {
      const result = createCheckpointRequestSchema.safeParse({
        name: 'Test',
        chain_type: 'evm',
        points_value: 0,
      })
      expect(result.success).toBe(false)
    })

    it('should reject points_value above 10000', () => {
      const result = createCheckpointRequestSchema.safeParse({
        name: 'Test',
        chain_type: 'evm',
        points_value: 10001,
      })
      expect(result.success).toBe(false)
    })

    it('should coerce points_value from string', () => {
      const result = createCheckpointRequestSchema.safeParse({
        name: 'Test',
        chain_type: 'evm',
        points_value: '250',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.points_value).toBe(250)
      }
    })

    it('should accept nullable partner_image_url', () => {
      const result = createCheckpointRequestSchema.safeParse({
        name: 'Test',
        chain_type: 'evm',
        partner_image_url: null,
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid partner_image_url', () => {
      const result = createCheckpointRequestSchema.safeParse({
        name: 'Test',
        chain_type: 'evm',
        partner_image_url: 'not-a-url',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateCheckpointRequestSchema', () => {
    it('should accept empty object (all fields optional)', () => {
      const result = updateCheckpointRequestSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept partial update', () => {
      const result = updateCheckpointRequestSchema.safeParse({
        name: 'Updated Name',
        is_active: false,
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid values when provided', () => {
      expect(updateCheckpointRequestSchema.safeParse({ name: '' }).success).toBe(false)
      expect(updateCheckpointRequestSchema.safeParse({ points_value: 0 }).success).toBe(false)
      expect(updateCheckpointRequestSchema.safeParse({ chain_type: 'invalid' }).success).toBe(false)
    })

    it('should accept nullable description', () => {
      const result = updateCheckpointRequestSchema.safeParse({
        description: null,
      })
      expect(result.success).toBe(true)
    })
  })
})

import { describe, it, expect } from 'vitest'
import {
  createPerkSchema,
  updatePerkSchema,
  redeemPerkSchema,
  createDiscountCodesSchema,
  createLocationListSchema,
  updateLocationListSchema,
} from '../perk'

describe('Perk Schemas', () => {
  describe('createPerkSchema', () => {
    it('should accept valid perk creation with required fields', () => {
      const validPerk = {
        title: 'Free Coffee',
        description: 'Get a free coffee at participating locations',
        points_threshold: 1000,
        type: 'discount',
      }
      const result = createPerkSchema.safeParse(validPerk)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.is_active).toBe(true) // default
      }
    })

    it('should accept perk with all optional fields', () => {
      const validPerk = {
        title: 'Free Coffee',
        description: 'Get a free coffee at participating locations',
        location: 'Downtown',
        points_threshold: 1000,
        website_url: 'https://example.com',
        type: 'discount',
        end_date: '2024-12-31T23:59:59Z',
        is_active: false,
        thumbnail_url: 'https://example.com/thumb.jpg',
        hero_image: 'https://example.com/hero.jpg',
      }
      const result = createPerkSchema.safeParse(validPerk)
      expect(result.success).toBe(true)
    })

    it('should reject empty title', () => {
      const result = createPerkSchema.safeParse({
        title: '',
        description: 'Description',
        points_threshold: 1000,
        type: 'discount',
      })
      expect(result.success).toBe(false)
    })

    it('should reject title over 200 characters', () => {
      const result = createPerkSchema.safeParse({
        title: 'a'.repeat(201),
        description: 'Description',
        points_threshold: 1000,
        type: 'discount',
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty description', () => {
      const result = createPerkSchema.safeParse({
        title: 'Title',
        description: '',
        points_threshold: 1000,
        type: 'discount',
      })
      expect(result.success).toBe(false)
    })

    it('should reject description over 2000 characters', () => {
      const result = createPerkSchema.safeParse({
        title: 'Title',
        description: 'a'.repeat(2001),
        points_threshold: 1000,
        type: 'discount',
      })
      expect(result.success).toBe(false)
    })

    it('should reject negative points_threshold', () => {
      const result = createPerkSchema.safeParse({
        title: 'Title',
        description: 'Description',
        points_threshold: -1,
        type: 'discount',
      })
      expect(result.success).toBe(false)
    })

    it('should accept points_threshold of 0', () => {
      const result = createPerkSchema.safeParse({
        title: 'Title',
        description: 'Description',
        points_threshold: 0,
        type: 'discount',
      })
      expect(result.success).toBe(true)
    })

    it('should reject non-integer points_threshold', () => {
      const result = createPerkSchema.safeParse({
        title: 'Title',
        description: 'Description',
        points_threshold: 100.5,
        type: 'discount',
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty type', () => {
      const result = createPerkSchema.safeParse({
        title: 'Title',
        description: 'Description',
        points_threshold: 1000,
        type: '',
      })
      expect(result.success).toBe(false)
    })

    it('should reject location over 200 characters', () => {
      const result = createPerkSchema.safeParse({
        title: 'Title',
        description: 'Description',
        points_threshold: 1000,
        type: 'discount',
        location: 'a'.repeat(201),
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid website_url', () => {
      const result = createPerkSchema.safeParse({
        title: 'Title',
        description: 'Description',
        points_threshold: 1000,
        type: 'discount',
        website_url: 'not-a-url',
      })
      expect(result.success).toBe(false)
    })

    it('should accept null end_date', () => {
      const result = createPerkSchema.safeParse({
        title: 'Title',
        description: 'Description',
        points_threshold: 1000,
        type: 'discount',
        end_date: null,
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid end_date format', () => {
      const result = createPerkSchema.safeParse({
        title: 'Title',
        description: 'Description',
        points_threshold: 1000,
        type: 'discount',
        end_date: '2024-12-31', // not ISO datetime
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid thumbnail_url', () => {
      const result = createPerkSchema.safeParse({
        title: 'Title',
        description: 'Description',
        points_threshold: 1000,
        type: 'discount',
        thumbnail_url: 'not-a-url',
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid hero_image', () => {
      const result = createPerkSchema.safeParse({
        title: 'Title',
        description: 'Description',
        points_threshold: 1000,
        type: 'discount',
        hero_image: 'not-a-url',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updatePerkSchema', () => {
    it('should accept empty object (all fields optional)', () => {
      const result = updatePerkSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept partial update', () => {
      const result = updatePerkSchema.safeParse({
        title: 'Updated Title',
        is_active: false,
      })
      expect(result.success).toBe(true)
    })

    it('should accept all fields', () => {
      const result = updatePerkSchema.safeParse({
        title: 'Updated Title',
        description: 'Updated description',
        location: 'New Location',
        points_threshold: 2000,
        website_url: 'https://updated.com',
        type: 'exclusive',
        end_date: '2025-06-30T23:59:59Z',
        is_active: true,
        thumbnail_url: 'https://example.com/new-thumb.jpg',
        hero_image: 'https://example.com/new-hero.jpg',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid values when provided', () => {
      expect(updatePerkSchema.safeParse({ title: '' }).success).toBe(false)
      expect(updatePerkSchema.safeParse({ description: '' }).success).toBe(false)
      expect(updatePerkSchema.safeParse({ type: '' }).success).toBe(false)
      expect(updatePerkSchema.safeParse({ points_threshold: -1 }).success).toBe(false)
    })

    it('should accept null end_date', () => {
      const result = updatePerkSchema.safeParse({ end_date: null })
      expect(result.success).toBe(true)
    })
  })

  describe('redeemPerkSchema', () => {
    it('should accept valid redemption request', () => {
      const validRequest = {
        perkId: '550e8400-e29b-41d4-a716-446655440000',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      }
      const result = redeemPerkSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should reject missing perkId', () => {
      const result = redeemPerkSchema.safeParse({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid perkId (not UUID)', () => {
      const result = redeemPerkSchema.safeParse({
        perkId: 'not-a-uuid',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing walletAddress', () => {
      const result = redeemPerkSchema.safeParse({
        perkId: '550e8400-e29b-41d4-a716-446655440000',
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid walletAddress', () => {
      const result = redeemPerkSchema.safeParse({
        perkId: '550e8400-e29b-41d4-a716-446655440000',
        walletAddress: 'invalid-address',
      })
      expect(result.success).toBe(false)
    })

    it('should reject non-string types', () => {
      expect(redeemPerkSchema.safeParse({ perkId: 123, walletAddress: '0x1234567890abcdef1234567890abcdef12345678' }).success).toBe(false)
      expect(redeemPerkSchema.safeParse({ perkId: '550e8400-e29b-41d4-a716-446655440000', walletAddress: 123 }).success).toBe(false)
    })
  })

  describe('createDiscountCodesSchema', () => {
    it('should accept valid discount codes creation', () => {
      const validRequest = {
        perkId: '550e8400-e29b-41d4-a716-446655440000',
        codes: ['CODE1', 'CODE2', 'CODE3'],
      }
      const result = createDiscountCodesSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isUniversal).toBe(false) // default
      }
    })

    it('should accept with isUniversal flag', () => {
      const result = createDiscountCodesSchema.safeParse({
        perkId: '550e8400-e29b-41d4-a716-446655440000',
        codes: ['UNIVERSAL'],
        isUniversal: true,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isUniversal).toBe(true)
      }
    })

    it('should reject invalid perkId', () => {
      const result = createDiscountCodesSchema.safeParse({
        perkId: 'not-a-uuid',
        codes: ['CODE1'],
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty codes array', () => {
      const result = createDiscountCodesSchema.safeParse({
        perkId: '550e8400-e29b-41d4-a716-446655440000',
        codes: [],
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty string in codes', () => {
      const result = createDiscountCodesSchema.safeParse({
        perkId: '550e8400-e29b-41d4-a716-446655440000',
        codes: ['CODE1', ''],
      })
      expect(result.success).toBe(false)
    })

    it('should reject code over 100 characters', () => {
      const result = createDiscountCodesSchema.safeParse({
        perkId: '550e8400-e29b-41d4-a716-446655440000',
        codes: ['a'.repeat(101)],
      })
      expect(result.success).toBe(false)
    })

    it('should accept single code', () => {
      const result = createDiscountCodesSchema.safeParse({
        perkId: '550e8400-e29b-41d4-a716-446655440000',
        codes: ['SINGLE'],
      })
      expect(result.success).toBe(true)
    })
  })

  describe('createLocationListSchema', () => {
    it('should accept valid location list creation', () => {
      const validRequest = {
        title: 'Best Coffee Shops',
        slug: 'best-coffee-shops',
      }
      const result = createLocationListSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.is_active).toBe(true) // default
      }
    })

    it('should accept all optional fields', () => {
      const result = createLocationListSchema.safeParse({
        title: 'Best Coffee Shops',
        slug: 'best-coffee-shops',
        description: 'A curated list of the best coffee shops in the city',
        accent_color: '#FF5733',
        is_active: false,
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty title', () => {
      const result = createLocationListSchema.safeParse({
        title: '',
        slug: 'valid-slug',
      })
      expect(result.success).toBe(false)
    })

    it('should reject title over 200 characters', () => {
      const result = createLocationListSchema.safeParse({
        title: 'a'.repeat(201),
        slug: 'valid-slug',
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty slug', () => {
      const result = createLocationListSchema.safeParse({
        title: 'Title',
        slug: '',
      })
      expect(result.success).toBe(false)
    })

    it('should reject slug over 100 characters', () => {
      const result = createLocationListSchema.safeParse({
        title: 'Title',
        slug: 'a'.repeat(101),
      })
      expect(result.success).toBe(false)
    })

    it('should reject slug with uppercase characters', () => {
      const result = createLocationListSchema.safeParse({
        title: 'Title',
        slug: 'Invalid-Slug',
      })
      expect(result.success).toBe(false)
    })

    it('should reject slug with spaces', () => {
      const result = createLocationListSchema.safeParse({
        title: 'Title',
        slug: 'invalid slug',
      })
      expect(result.success).toBe(false)
    })

    it('should reject slug with special characters', () => {
      const result = createLocationListSchema.safeParse({
        title: 'Title',
        slug: 'invalid_slug!',
      })
      expect(result.success).toBe(false)
    })

    it('should accept valid slug with numbers and hyphens', () => {
      const result = createLocationListSchema.safeParse({
        title: 'Title',
        slug: 'list-2024-v2',
      })
      expect(result.success).toBe(true)
    })

    it('should reject description over 1000 characters', () => {
      const result = createLocationListSchema.safeParse({
        title: 'Title',
        slug: 'valid-slug',
        description: 'a'.repeat(1001),
      })
      expect(result.success).toBe(false)
    })

    it('should accept null description', () => {
      const result = createLocationListSchema.safeParse({
        title: 'Title',
        slug: 'valid-slug',
        description: null,
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid hex color format', () => {
      expect(createLocationListSchema.safeParse({
        title: 'Title',
        slug: 'valid-slug',
        accent_color: 'red',
      }).success).toBe(false)

      expect(createLocationListSchema.safeParse({
        title: 'Title',
        slug: 'valid-slug',
        accent_color: '#FFF',
      }).success).toBe(false)

      expect(createLocationListSchema.safeParse({
        title: 'Title',
        slug: 'valid-slug',
        accent_color: '#GGGGGG',
      }).success).toBe(false)
    })

    it('should accept valid hex colors', () => {
      expect(createLocationListSchema.safeParse({
        title: 'Title',
        slug: 'valid-slug',
        accent_color: '#FF5733',
      }).success).toBe(true)

      expect(createLocationListSchema.safeParse({
        title: 'Title',
        slug: 'valid-slug',
        accent_color: '#ffffff',
      }).success).toBe(true)
    })

    it('should accept null accent_color', () => {
      const result = createLocationListSchema.safeParse({
        title: 'Title',
        slug: 'valid-slug',
        accent_color: null,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('updateLocationListSchema', () => {
    it('should accept empty object (all fields optional)', () => {
      const result = updateLocationListSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept partial update', () => {
      const result = updateLocationListSchema.safeParse({
        title: 'Updated Title',
        is_active: false,
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid values when provided', () => {
      expect(updateLocationListSchema.safeParse({ title: '' }).success).toBe(false)
      expect(updateLocationListSchema.safeParse({ slug: '' }).success).toBe(false)
      expect(updateLocationListSchema.safeParse({ slug: 'Invalid' }).success).toBe(false)
      expect(updateLocationListSchema.safeParse({ accent_color: 'red' }).success).toBe(false)
    })

    it('should accept null values for optional fields', () => {
      const result = updateLocationListSchema.safeParse({
        description: null,
        accent_color: null,
      })
      expect(result.success).toBe(true)
    })
  })
})

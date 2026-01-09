import { describe, it, expect } from 'vitest'
import {
  latitudeSchema,
  longitudeSchema,
  createLocationSchema,
  updateLocationSchema,
  locationSearchSchema,
} from '../location'

describe('Location Schemas', () => {
  describe('latitudeSchema', () => {
    it('should accept valid latitude at minimum (-90)', () => {
      const result = latitudeSchema.safeParse(-90)
      expect(result.success).toBe(true)
    })

    it('should accept valid latitude at maximum (90)', () => {
      const result = latitudeSchema.safeParse(90)
      expect(result.success).toBe(true)
    })

    it('should accept latitude at zero', () => {
      const result = latitudeSchema.safeParse(0)
      expect(result.success).toBe(true)
    })

    it('should accept valid latitude (positive)', () => {
      const result = latitudeSchema.safeParse(40.7128)
      expect(result.success).toBe(true)
    })

    it('should accept valid latitude (negative)', () => {
      const result = latitudeSchema.safeParse(-33.8688)
      expect(result.success).toBe(true)
    })

    it('should reject latitude below minimum', () => {
      const result = latitudeSchema.safeParse(-90.1)
      expect(result.success).toBe(false)
    })

    it('should reject latitude above maximum', () => {
      const result = latitudeSchema.safeParse(90.1)
      expect(result.success).toBe(false)
    })

    it('should reject non-number types', () => {
      expect(latitudeSchema.safeParse('40.7128').success).toBe(false)
      expect(latitudeSchema.safeParse(null).success).toBe(false)
      expect(latitudeSchema.safeParse(undefined).success).toBe(false)
    })
  })

  describe('longitudeSchema', () => {
    it('should accept valid longitude at minimum (-180)', () => {
      const result = longitudeSchema.safeParse(-180)
      expect(result.success).toBe(true)
    })

    it('should accept valid longitude at maximum (180)', () => {
      const result = longitudeSchema.safeParse(180)
      expect(result.success).toBe(true)
    })

    it('should accept longitude at zero', () => {
      const result = longitudeSchema.safeParse(0)
      expect(result.success).toBe(true)
    })

    it('should accept valid longitude (positive)', () => {
      const result = longitudeSchema.safeParse(74.006)
      expect(result.success).toBe(true)
    })

    it('should accept valid longitude (negative)', () => {
      const result = longitudeSchema.safeParse(-74.006)
      expect(result.success).toBe(true)
    })

    it('should reject longitude below minimum', () => {
      const result = longitudeSchema.safeParse(-180.1)
      expect(result.success).toBe(false)
    })

    it('should reject longitude above maximum', () => {
      const result = longitudeSchema.safeParse(180.1)
      expect(result.success).toBe(false)
    })

    it('should reject non-number types', () => {
      expect(longitudeSchema.safeParse('-74.006').success).toBe(false)
      expect(longitudeSchema.safeParse(null).success).toBe(false)
      expect(longitudeSchema.safeParse(undefined).success).toBe(false)
    })
  })

  describe('createLocationSchema', () => {
    const validLocation = {
      name: 'Central Park',
      display_name: 'Central Park, NYC',
      latitude: 40.7829,
      longitude: -73.9654,
      place_id: 'ChIJ4zGFAZpYwokRGUGph3Mf37k',
      points_value: 100,
    }

    it('should accept valid location with required fields', () => {
      const result = createLocationSchema.safeParse(validLocation)
      expect(result.success).toBe(true)
    })

    it('should accept location with all optional fields', () => {
      const fullLocation = {
        ...validLocation,
        description: 'A beautiful park in Manhattan',
        type: 'park',
        event_url: 'https://centralparknyc.org/events',
        context: 'some-context',
        coin_address: '0x1234567890abcdef1234567890abcdef12345678',
        coin_symbol: 'PARK',
        coin_name: 'Park Token',
        coin_image_url: 'https://example.com/coin.png',
        coin_transaction_hash: '0xabc123',
        creator_wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        creator_username: 'parkmaker',
      }
      const result = createLocationSchema.safeParse(fullLocation)
      expect(result.success).toBe(true)
    })

    it('should reject empty name', () => {
      const result = createLocationSchema.safeParse({
        ...validLocation,
        name: '',
      })
      expect(result.success).toBe(false)
    })

    it('should reject name over 200 characters', () => {
      const result = createLocationSchema.safeParse({
        ...validLocation,
        name: 'a'.repeat(201),
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty display_name', () => {
      const result = createLocationSchema.safeParse({
        ...validLocation,
        display_name: '',
      })
      expect(result.success).toBe(false)
    })

    it('should reject display_name over 200 characters', () => {
      const result = createLocationSchema.safeParse({
        ...validLocation,
        display_name: 'a'.repeat(201),
      })
      expect(result.success).toBe(false)
    })

    it('should reject description over 1000 characters', () => {
      const result = createLocationSchema.safeParse({
        ...validLocation,
        description: 'a'.repeat(1001),
      })
      expect(result.success).toBe(false)
    })

    it('should accept null description', () => {
      const result = createLocationSchema.safeParse({
        ...validLocation,
        description: null,
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid latitude', () => {
      const result = createLocationSchema.safeParse({
        ...validLocation,
        latitude: 100,
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid longitude', () => {
      const result = createLocationSchema.safeParse({
        ...validLocation,
        longitude: 200,
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty place_id', () => {
      const result = createLocationSchema.safeParse({
        ...validLocation,
        place_id: '',
      })
      expect(result.success).toBe(false)
    })

    it('should reject negative points_value', () => {
      const result = createLocationSchema.safeParse({
        ...validLocation,
        points_value: -1,
      })
      expect(result.success).toBe(false)
    })

    it('should accept points_value of 0', () => {
      const result = createLocationSchema.safeParse({
        ...validLocation,
        points_value: 0,
      })
      expect(result.success).toBe(true)
    })

    it('should reject non-integer points_value', () => {
      const result = createLocationSchema.safeParse({
        ...validLocation,
        points_value: 100.5,
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid event_url', () => {
      const result = createLocationSchema.safeParse({
        ...validLocation,
        event_url: 'not-a-url',
      })
      expect(result.success).toBe(false)
    })

    it('should accept null event_url', () => {
      const result = createLocationSchema.safeParse({
        ...validLocation,
        event_url: null,
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid coin_image_url', () => {
      const result = createLocationSchema.safeParse({
        ...validLocation,
        coin_image_url: 'not-a-url',
      })
      expect(result.success).toBe(false)
    })

    it('should accept null coin_image_url', () => {
      const result = createLocationSchema.safeParse({
        ...validLocation,
        coin_image_url: null,
      })
      expect(result.success).toBe(true)
    })

    it('should reject missing required fields', () => {
      expect(createLocationSchema.safeParse({ name: 'Test' }).success).toBe(false)
      expect(createLocationSchema.safeParse({ ...validLocation, latitude: undefined }).success).toBe(false)
      expect(createLocationSchema.safeParse({ ...validLocation, longitude: undefined }).success).toBe(false)
      expect(createLocationSchema.safeParse({ ...validLocation, place_id: undefined }).success).toBe(false)
      expect(createLocationSchema.safeParse({ ...validLocation, points_value: undefined }).success).toBe(false)
    })
  })

  describe('updateLocationSchema', () => {
    it('should accept empty object (all fields optional)', () => {
      const result = updateLocationSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept partial update', () => {
      const result = updateLocationSchema.safeParse({
        name: 'Updated Name',
        latitude: 41.0,
      })
      expect(result.success).toBe(true)
    })

    it('should accept all updateable fields', () => {
      const result = updateLocationSchema.safeParse({
        name: 'Updated Name',
        display_name: 'Updated Display Name',
        place_id: 'new-place-id',
        latitude: 41.0,
        longitude: -74.0,
        creator_wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        creator_username: 'newuser',
        coin_image_url: 'https://example.com/new-coin.png',
        type: 'restaurant',
        event_url: 'https://example.com/event',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid values when provided', () => {
      expect(updateLocationSchema.safeParse({ name: '' }).success).toBe(false)
      expect(updateLocationSchema.safeParse({ display_name: '' }).success).toBe(false)
      expect(updateLocationSchema.safeParse({ place_id: '' }).success).toBe(false)
      expect(updateLocationSchema.safeParse({ latitude: 100 }).success).toBe(false)
      expect(updateLocationSchema.safeParse({ longitude: 200 }).success).toBe(false)
    })

    it('should accept null values for nullable fields', () => {
      const result = updateLocationSchema.safeParse({
        coin_image_url: null,
        event_url: null,
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid URLs when provided', () => {
      expect(updateLocationSchema.safeParse({ coin_image_url: 'not-a-url' }).success).toBe(false)
      expect(updateLocationSchema.safeParse({ event_url: 'not-a-url' }).success).toBe(false)
    })
  })

  describe('locationSearchSchema', () => {
    it('should accept empty object and use defaults', () => {
      const result = locationSearchSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(250)
      }
    })

    it('should accept search term', () => {
      const result = locationSearchSchema.safeParse({ search: 'coffee' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.search).toBe('coffee')
      }
    })

    it('should accept custom limit', () => {
      const result = locationSearchSchema.safeParse({ limit: 50 })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(50)
      }
    })

    it('should reject limit below minimum (1)', () => {
      const result = locationSearchSchema.safeParse({ limit: 0 })
      expect(result.success).toBe(false)
    })

    it('should reject limit above maximum (250)', () => {
      const result = locationSearchSchema.safeParse({ limit: 251 })
      expect(result.success).toBe(false)
    })

    it('should accept boundary values', () => {
      expect(locationSearchSchema.safeParse({ limit: 1 }).success).toBe(true)
      expect(locationSearchSchema.safeParse({ limit: 250 }).success).toBe(true)
    })

    it('should reject non-integer limit', () => {
      const result = locationSearchSchema.safeParse({ limit: 10.5 })
      expect(result.success).toBe(false)
    })

    it('should accept both search and limit', () => {
      const result = locationSearchSchema.safeParse({
        search: 'park',
        limit: 100,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.search).toBe('park')
        expect(result.data.limit).toBe(100)
      }
    })

    it('should accept empty search string', () => {
      const result = locationSearchSchema.safeParse({ search: '' })
      expect(result.success).toBe(true)
    })
  })
})

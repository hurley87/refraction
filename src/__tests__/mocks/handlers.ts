/**
 * MSW API request handlers for testing
 *
 * These handlers provide mock API responses for component and hook tests.
 * Override handlers in individual tests using server.use() for specific scenarios.
 *
 * @see https://mswjs.io/docs/getting-started
 */
import { http, HttpResponse } from 'msw'
import type { ApiResponse } from '@/lib/api/response'

// Helper to create successful API responses matching our format
function apiSuccess<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
  }
}

// Helper to create error API responses
function apiError(error: string): ApiResponse {
  return {
    success: false,
    error,
  }
}

// Mock data factories
export const mockPlayer = {
  id: 'player-123',
  wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
  email: 'test@example.com',
  username: 'testuser',
  display_name: 'Test User',
  total_points: 1500,
  tier_id: 'tier-2',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

export const mockTier = {
  id: 'tier-2',
  name: 'Silver',
  min_points: 1000,
  max_points: 4999,
  color: '#C0C0C0',
  order: 2,
}

export const mockLocation = {
  id: 'location-123',
  name: 'Test Location',
  address: '123 Test St, New York, NY',
  latitude: 40.7128,
  longitude: -74.006,
  points: 100,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
}

export const mockPerk = {
  id: 'perk-123',
  name: 'Free Coffee',
  description: 'Get a free coffee at participating locations',
  points_cost: 500,
  tier_id: 'tier-1',
  is_active: true,
  available_count: 10,
  image_url: '/images/perks/coffee.png',
}

export const mockLeaderboardEntry = {
  rank: 1,
  player_id: 'player-123',
  display_name: 'Test User',
  total_points: 1500,
  tier_name: 'Silver',
}

// Default API handlers
export const handlers = [
  // Player endpoints
  http.get('/api/player', ({ request }) => {
    const url = new URL(request.url)
    const walletAddress = url.searchParams.get('walletAddress')

    if (!walletAddress) {
      return HttpResponse.json(apiError('walletAddress is required'), { status: 400 })
    }

    return HttpResponse.json(apiSuccess({ player: mockPlayer }))
  }),

  http.post('/api/player', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>

    if (!body.walletAddress) {
      return HttpResponse.json(apiError('walletAddress is required'), { status: 400 })
    }

    return HttpResponse.json(
      apiSuccess({ player: { ...mockPlayer, wallet_address: body.walletAddress as string } }),
      { status: 201 }
    )
  }),

  http.get('/api/player/rank', ({ request }) => {
    const url = new URL(request.url)
    const playerId = url.searchParams.get('playerId')

    if (!playerId) {
      return HttpResponse.json(apiError('playerId is required'), { status: 400 })
    }

    return HttpResponse.json(apiSuccess({ rank: 42 }))
  }),

  // Leaderboard
  http.get('/api/leaderboard', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')

    const entries = Array.from({ length: limit }, (_, i) => ({
      ...mockLeaderboardEntry,
      rank: (page - 1) * limit + i + 1,
      player_id: `player-${(page - 1) * limit + i + 1}`,
      display_name: `User ${(page - 1) * limit + i + 1}`,
      total_points: 10000 - ((page - 1) * limit + i) * 100,
    }))

    return HttpResponse.json(
      apiSuccess({
        leaderboard: entries,
        total: 100,
        page,
        limit,
      })
    )
  }),

  // Tiers
  http.get('/api/tiers', () => {
    return HttpResponse.json(
      apiSuccess({
        tiers: [
          { ...mockTier, id: 'tier-1', name: 'Bronze', min_points: 0, max_points: 999, order: 1 },
          { ...mockTier, id: 'tier-2', name: 'Silver', min_points: 1000, max_points: 4999, order: 2 },
          { ...mockTier, id: 'tier-3', name: 'Gold', min_points: 5000, max_points: 9999, order: 3 },
          { ...mockTier, id: 'tier-4', name: 'Platinum', min_points: 10000, max_points: null, order: 4 },
        ],
      })
    )
  }),

  // Locations
  http.get('/api/locations', () => {
    return HttpResponse.json(
      apiSuccess({
        locations: [
          mockLocation,
          { ...mockLocation, id: 'location-456', name: 'Another Location' },
        ],
      })
    )
  }),

  // Check-in status
  http.get('/api/checkin-status', ({ request }) => {
    const url = new URL(request.url)
    const locationId = url.searchParams.get('locationId')
    const playerId = url.searchParams.get('playerId')

    if (!locationId || !playerId) {
      return HttpResponse.json(apiError('locationId and playerId are required'), { status: 400 })
    }

    return HttpResponse.json(
      apiSuccess({
        canCheckIn: true,
        lastCheckIn: null,
        cooldownEndsAt: null,
      })
    )
  }),

  // Check-in
  http.post('/api/checkin', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>

    if (!body.locationId || !body.playerId) {
      return HttpResponse.json(apiError('locationId and playerId are required'), { status: 400 })
    }

    return HttpResponse.json(
      apiSuccess({
        checkIn: {
          id: 'checkin-123',
          player_id: body.playerId,
          location_id: body.locationId,
          points_earned: 100,
          created_at: new Date().toISOString(),
        },
        newPoints: mockPlayer.total_points + 100,
      }),
      { status: 201 }
    )
  }),

  // Location check-in (location-based)
  http.post('/api/location-checkin', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>

    if (!body.locationId || !body.playerId) {
      return HttpResponse.json(apiError('locationId and playerId are required'), { status: 400 })
    }

    return HttpResponse.json(
      apiSuccess({
        checkIn: {
          id: 'checkin-123',
          player_id: body.playerId,
          location_id: body.locationId,
          points_earned: 100,
          created_at: new Date().toISOString(),
        },
      }),
      { status: 201 }
    )
  }),

  // Perks
  http.get('/api/perks', () => {
    return HttpResponse.json(
      apiSuccess({
        perks: [
          mockPerk,
          { ...mockPerk, id: 'perk-456', name: 'Free Snack', points_cost: 300 },
        ],
      })
    )
  }),

  http.get('/api/perks/:id', ({ params }) => {
    const { id } = params

    return HttpResponse.json(apiSuccess({ perk: { ...mockPerk, id } }))
  }),

  http.get('/api/perks/:id/available-count', ({ params }) => {
    const { id } = params

    return HttpResponse.json(apiSuccess({ perk_id: id, available_count: 10 }))
  }),

  http.post('/api/perks/redeem', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>

    if (!body.perkId || !body.playerId) {
      return HttpResponse.json(apiError('perkId and playerId are required'), { status: 400 })
    }

    return HttpResponse.json(
      apiSuccess({
        redemption: {
          id: 'redemption-123',
          perk_id: body.perkId,
          player_id: body.playerId,
          code: 'REDEEM123',
          redeemed_at: new Date().toISOString(),
        },
      }),
      { status: 201 }
    )
  }),

  // User redemptions
  http.get('/api/user/redemptions', ({ request }) => {
    const url = new URL(request.url)
    const playerId = url.searchParams.get('playerId')

    if (!playerId) {
      return HttpResponse.json(apiError('playerId is required'), { status: 400 })
    }

    return HttpResponse.json(
      apiSuccess({
        redemptions: [],
      })
    )
  }),

  // Activities
  http.get('/api/activities', ({ request }) => {
    const url = new URL(request.url)
    const playerId = url.searchParams.get('playerId')

    if (!playerId) {
      return HttpResponse.json(apiError('playerId is required'), { status: 400 })
    }

    return HttpResponse.json(
      apiSuccess({
        activities: [
          {
            id: 'activity-1',
            type: 'checkin',
            points: 100,
            location_name: 'Test Location',
            created_at: new Date().toISOString(),
          },
        ],
      })
    )
  }),

  // Newsletter
  http.post('/api/newsletter', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>

    if (!body.email) {
      return HttpResponse.json(apiError('email is required'), { status: 400 })
    }

    return HttpResponse.json(apiSuccess({ subscribed: true }), { status: 201 })
  }),

  // Stellar wallet
  http.get('/api/stellar-wallet', ({ request }) => {
    const url = new URL(request.url)
    const playerId = url.searchParams.get('playerId')

    if (!playerId) {
      return HttpResponse.json(apiError('playerId is required'), { status: 400 })
    }

    return HttpResponse.json(
      apiSuccess({
        wallet: {
          public_key: 'GTEST123456789',
          created_at: '2024-01-01T00:00:00Z',
        },
      })
    )
  }),

  http.post('/api/stellar-wallet', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>

    if (!body.playerId) {
      return HttpResponse.json(apiError('playerId is required'), { status: 400 })
    }

    return HttpResponse.json(
      apiSuccess({
        wallet: {
          public_key: 'GNEW123456789',
          created_at: new Date().toISOString(),
        },
      }),
      { status: 201 }
    )
  }),

  // Transfer tokens
  http.post('/api/transfer-tokens', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>

    if (!body.toAddress || !body.amount) {
      return HttpResponse.json(apiError('toAddress and amount are required'), { status: 400 })
    }

    return HttpResponse.json(
      apiSuccess({
        transactionHash: '0xabc123def456',
        amount: body.amount,
      }),
      { status: 201 }
    )
  }),

  // Geocode
  http.get('/api/geocode-mapbox', ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('query')

    if (!query) {
      return HttpResponse.json(apiError('query is required'), { status: 400 })
    }

    return HttpResponse.json(
      apiSuccess({
        results: [
          {
            place_name: '123 Test St, New York, NY',
            center: [-74.006, 40.7128],
          },
        ],
      })
    )
  }),

  // Profile
  http.get('/api/profile', ({ request }) => {
    const url = new URL(request.url)
    const walletAddress = url.searchParams.get('walletAddress')

    if (!walletAddress) {
      return HttpResponse.json(apiError('walletAddress is required'), { status: 400 })
    }

    return HttpResponse.json(
      apiSuccess({
        player: mockPlayer,
        tier: mockTier,
        stats: {
          total_checkins: 15,
          locations_visited: 8,
          perks_redeemed: 2,
        },
      })
    )
  }),
]

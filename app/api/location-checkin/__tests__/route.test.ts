import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { Player, Location, PlayerLocationCheckin } from '@/lib/types';

// Mock analytics before importing route
vi.mock('@/lib/analytics', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/analytics')>('@/lib/analytics');
  return {
    ...actual,
    trackCheckinCompleted: vi.fn(),
    trackPointsEarned: vi.fn(),
  };
});

// Mock database functions
vi.mock('@/lib/db/players', () => ({
  createOrUpdatePlayer: vi.fn(),
  getPlayerByWallet: vi.fn(),
  updatePlayerPoints: vi.fn(),
}));

vi.mock('@/lib/db/locations', () => ({
  createOrGetLocation: vi.fn(),
}));

vi.mock('@/lib/db/checkins', () => ({
  checkUserLocationCheckin: vi.fn(),
  createLocationCheckin: vi.fn(),
}));

import { POST, GET } from '../route';
import {
  createOrUpdatePlayer,
  getPlayerByWallet,
  updatePlayerPoints,
} from '@/lib/db/players';
import { createOrGetLocation } from '@/lib/db/locations';
import {
  checkUserLocationCheckin,
  createLocationCheckin,
} from '@/lib/db/checkins';
import { trackCheckinCompleted, trackPointsEarned } from '@/lib/analytics';

// Helper to create NextRequest with JSON body for POST
function createPostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/location-checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Helper to create NextRequest for GET
function createGetRequest(walletAddress?: string): NextRequest {
  const url = walletAddress
    ? `http://localhost:3000/api/location-checkin?walletAddress=${walletAddress}`
    : 'http://localhost:3000/api/location-checkin';
  return new NextRequest(url, { method: 'GET' });
}

describe('Location Checkin API Route', () => {
  const validWallet = '0x1234567890abcdef1234567890abcdef12345678';
  const validLocationData = {
    place_id: 'test-place-123',
    name: 'Test Venue Name',
    lat: 40.7128,
    lon: -74.006,
    type: 'venue',
    context: '{"city": "New York"}',
  };

  const mockPlayer: Player = {
    id: 1,
    wallet_address: validWallet,
    username: 'testuser',
    total_points: 100,
  };

  const mockLocation: Location = {
    id: 1,
    place_id: 'test-place-123',
    name: 'Test Venue Name',
    latitude: 40.7128,
    longitude: -74.006,
    points_value: 100,
    type: 'venue',
    is_visible: true,
  };

  const mockCheckin: PlayerLocationCheckin = {
    id: 1,
    player_id: 1,
    location_id: 1,
    points_earned: 100,
    checkin_at: '2024-01-15T10:00:00Z',
    created_at: '2024-01-15T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/location-checkin', () => {
    describe('Validation Errors', () => {
      it('should return 400 for missing walletAddress', async () => {
        const request = createPostRequest({ locationData: validLocationData });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toContain('Wallet address');
      });

      it('should return 400 for missing locationData', async () => {
        const request = createPostRequest({ walletAddress: validWallet });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toContain('location data');
      });

      it('should return 400 for invalid latitude (out of range)', async () => {
        const request = createPostRequest({
          walletAddress: validWallet,
          locationData: { ...validLocationData, lat: 91 },
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toContain('Invalid location data');
      });

      it('should return 400 for invalid longitude (out of range)', async () => {
        const request = createPostRequest({
          walletAddress: validWallet,
          locationData: { ...validLocationData, lon: 181 },
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toContain('Invalid location data');
      });

      it('should return 400 for missing place_id', async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { place_id, ...locationWithoutPlaceId } = validLocationData;
        const request = createPostRequest({
          walletAddress: validWallet,
          locationData: locationWithoutPlaceId,
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toContain('Invalid location data');
      });

      it('should return 400 for null latitude', async () => {
        const request = createPostRequest({
          walletAddress: validWallet,
          locationData: { ...validLocationData, lat: null },
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toContain('Invalid location data');
      });
    });

    describe('Successful Checkin', () => {
      it('should return success with points earned', async () => {
        vi.mocked(createOrUpdatePlayer).mockResolvedValue(mockPlayer);
        vi.mocked(createOrGetLocation).mockResolvedValue(mockLocation);
        vi.mocked(checkUserLocationCheckin).mockResolvedValue(null);
        vi.mocked(createLocationCheckin).mockResolvedValue(mockCheckin);
        vi.mocked(updatePlayerPoints).mockResolvedValue({
          ...mockPlayer,
          total_points: 200,
        });

        const request = createPostRequest({
          walletAddress: validWallet,
          locationData: validLocationData,
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.data.pointsEarned).toBe(100);
        expect(json.data.checkin).toBeDefined();
        expect(json.data.player).toBeDefined();
        expect(json.data.location).toBeDefined();
      });

      it('should call createOrUpdatePlayer with correct data', async () => {
        vi.mocked(createOrUpdatePlayer).mockResolvedValue(mockPlayer);
        vi.mocked(createOrGetLocation).mockResolvedValue(mockLocation);
        vi.mocked(checkUserLocationCheckin).mockResolvedValue(null);
        vi.mocked(createLocationCheckin).mockResolvedValue(mockCheckin);
        vi.mocked(updatePlayerPoints).mockResolvedValue(mockPlayer);

        const request = createPostRequest({
          walletAddress: validWallet,
          email: 'test@example.com',
          username: 'testuser',
          locationData: validLocationData,
        });

        await POST(request);

        expect(createOrUpdatePlayer).toHaveBeenCalledWith(
          expect.objectContaining({
            wallet_address: validWallet,
            email: 'test@example.com',
            username: 'testuser',
          })
        );
      });

      it('should correctly add points to player total', async () => {
        vi.mocked(createOrUpdatePlayer).mockResolvedValue(mockPlayer);
        vi.mocked(createOrGetLocation).mockResolvedValue(mockLocation);
        vi.mocked(checkUserLocationCheckin).mockResolvedValue(null);
        vi.mocked(createLocationCheckin).mockResolvedValue(mockCheckin);
        vi.mocked(updatePlayerPoints).mockResolvedValue({
          ...mockPlayer,
          total_points: 200,
        });

        const request = createPostRequest({
          walletAddress: validWallet,
          locationData: validLocationData,
        });

        const response = await POST(request);
        const json = await response.json();

        expect(updatePlayerPoints).toHaveBeenCalledWith(mockPlayer.id, 100);
        expect(json.data.player.total_points).toBe(200);
      });

      it('should track analytics events', async () => {
        vi.mocked(createOrUpdatePlayer).mockResolvedValue(mockPlayer);
        vi.mocked(createOrGetLocation).mockResolvedValue(mockLocation);
        vi.mocked(checkUserLocationCheckin).mockResolvedValue(null);
        vi.mocked(createLocationCheckin).mockResolvedValue(mockCheckin);
        vi.mocked(updatePlayerPoints).mockResolvedValue(mockPlayer);

        const request = createPostRequest({
          walletAddress: validWallet,
          locationData: validLocationData,
        });

        await POST(request);

        expect(trackCheckinCompleted).toHaveBeenCalled();
        expect(trackPointsEarned).toHaveBeenCalled();
      });
    });

    describe('Duplicate Checkin', () => {
      it('should return 409 when user already checked in at location', async () => {
        vi.mocked(createOrUpdatePlayer).mockResolvedValue(mockPlayer);
        vi.mocked(createOrGetLocation).mockResolvedValue(mockLocation);
        vi.mocked(checkUserLocationCheckin).mockResolvedValue(mockCheckin);

        const request = createPostRequest({
          walletAddress: validWallet,
          locationData: validLocationData,
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(409);
        expect(json.error).toContain('already checked in');
      });
    });

    describe('Hidden Location', () => {
      it('should return 403 for hidden location', async () => {
        vi.mocked(createOrUpdatePlayer).mockResolvedValue(mockPlayer);
        vi.mocked(createOrGetLocation).mockResolvedValue({
          ...mockLocation,
          is_visible: false,
        });

        const request = createPostRequest({
          walletAddress: validWallet,
          locationData: validLocationData,
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(403);
        expect(json.error).toContain('not available for check-ins');
      });
    });

    describe('Database Errors', () => {
      it('should return 500 on database error', async () => {
        vi.mocked(createOrUpdatePlayer).mockRejectedValue(
          new Error('DB Error')
        );

        const request = createPostRequest({
          walletAddress: validWallet,
          locationData: validLocationData,
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(500);
        expect(json.error).toContain('Failed to process');
      });
    });
  });

  describe('GET /api/location-checkin', () => {
    it('should return 400 for missing walletAddress', async () => {
      const request = createGetRequest();

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toContain('Wallet address');
    });

    it('should return 404 when player not found', async () => {
      vi.mocked(getPlayerByWallet).mockResolvedValue(null);

      const request = createGetRequest(validWallet);

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.error).toContain('Player not found');
    });

    it('should return player data when found', async () => {
      vi.mocked(getPlayerByWallet).mockResolvedValue(mockPlayer);

      const request = createGetRequest(validWallet);

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.player).toEqual(mockPlayer);
    });

    it('should return 500 on database error', async () => {
      vi.mocked(getPlayerByWallet).mockRejectedValue(new Error('DB Error'));

      const request = createGetRequest(validWallet);

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toContain('Failed to get');
    });
  });
});

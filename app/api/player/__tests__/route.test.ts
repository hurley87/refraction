import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET, PATCH } from '../route';

// Mock the database functions
vi.mock('@/lib/db/players', () => ({
  createOrUpdatePlayer: vi.fn(),
  getPlayerByWallet: vi.fn(),
}));

vi.mock('@/lib/db/profiles', () => ({
  isUsernameTakenByOther: vi.fn().mockResolvedValue(false),
  isPostgresUniqueUsernameViolation: vi.fn(() => false),
}));

// Mock analytics
vi.mock('@/lib/analytics', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/analytics')>('@/lib/analytics');
  return {
    ...actual,
    trackAccountCreated: vi.fn(),
    resolveServerIdentity: actual.resolveServerIdentity,
  };
});

import { createOrUpdatePlayer, getPlayerByWallet } from '@/lib/db/players';
import { isUsernameTakenByOther } from '@/lib/db/profiles';
import { trackAccountCreated } from '@/lib/analytics';

// Helper to create a mock NextRequest
function createMockRequest(
  method: string,
  body?: object,
  searchParams?: Record<string, string>
): NextRequest {
  const url = new URL('http://localhost:3000/api/player');
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
  });
}

describe('Player API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/player', () => {
    it('should create a new player successfully', async () => {
      const mockPlayer = {
        id: '123',
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'testuser',
        email: 'test@example.com',
        total_points: 0,
        created_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(getPlayerByWallet).mockResolvedValueOnce(null);
      vi.mocked(createOrUpdatePlayer).mockResolvedValueOnce(mockPlayer);

      const request = createMockRequest('POST', {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'testuser',
        email: 'test@example.com',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.player).toEqual(mockPlayer);
      expect(json.message).toContain('testuser');
      expect(trackAccountCreated).toHaveBeenCalledWith(
        'test@example.com', // Email takes priority via resolveServerIdentity
        expect.objectContaining({
          wallet_type: 'EVM',
          has_email: true,
        })
      );
    });

    it('passes signup attribution into account_created when provided', async () => {
      const mockPlayer = {
        id: '123',
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'testuser',
        email: 'test@example.com',
        total_points: 0,
        created_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(getPlayerByWallet).mockResolvedValueOnce(null);
      vi.mocked(createOrUpdatePlayer).mockResolvedValueOnce(mockPlayer);

      const request = createMockRequest('POST', {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'testuser',
        email: 'test@example.com',
        signup_attribution: {
          initial_utm_source: 'instagram',
          initial_utm_medium: 'social',
          initial_utm_campaign: 'summer',
          initial_landing_page: 'https://irl.energy/',
          utm_source: 'instagram',
          utm_medium: 'social',
          landing_page: 'https://irl.energy/map',
          current_path: '/interactive-map',
        },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(trackAccountCreated).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          signup_source: 'instagram',
          signup_channel: 'social',
          initial_utm_source: 'instagram',
          utm_source: 'instagram',
          current_path: '/interactive-map',
        })
      );
    });

    it('normalizes checkpoint signup attribution on account_created', async () => {
      const mockPlayer = {
        id: '124',
        wallet_address: '0x2234567890abcdef2234567890abcdef22345678',
        username: 'cpuser',
        email: 'cp@example.com',
        total_points: 0,
        created_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(getPlayerByWallet).mockResolvedValueOnce(null);
      vi.mocked(createOrUpdatePlayer).mockResolvedValueOnce(mockPlayer);

      const request = createMockRequest('POST', {
        walletAddress: '0x2234567890abcdef2234567890abcdef22345678',
        username: 'cpuser',
        email: 'cp@example.com',
        signup_attribution: {
          checkpoint_id: 'chk-1',
          initial_landing_page: 'https://irl.energy/c/chk-1',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      expect(trackAccountCreated).toHaveBeenCalledWith(
        'cp@example.com',
        expect.objectContaining({
          signup_source: 'event',
          signup_channel: 'checkpoint',
          signup_context: 'physical_touchpoint',
          checkpoint_id: 'chk-1',
        })
      );
    });

    it('does not attach signup attribution fields when signup_attribution is empty', async () => {
      const mockPlayer = {
        id: '125',
        wallet_address: '0x3234567890abcdef3234567890abcdef32345678',
        username: 'emptyattr',
        email: 'empty@example.com',
        total_points: 0,
        created_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(getPlayerByWallet).mockResolvedValueOnce(null);
      vi.mocked(createOrUpdatePlayer).mockResolvedValueOnce(mockPlayer);

      const request = createMockRequest('POST', {
        walletAddress: '0x3234567890abcdef3234567890abcdef32345678',
        username: 'emptyattr',
        email: 'empty@example.com',
        signup_attribution: {},
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const props = vi.mocked(trackAccountCreated).mock.calls[0]?.[1];
      expect(props?.signup_source).toBeUndefined();
      expect(props?.wallet_type).toBe('EVM');
    });

    it('should return 409 when username is already taken', async () => {
      vi.mocked(isUsernameTakenByOther).mockResolvedValueOnce(true);

      const request = createMockRequest('POST', {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'takenuser',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Username is already taken');
      expect(createOrUpdatePlayer).not.toHaveBeenCalled();
    });

    it('should update existing player without tracking new account', async () => {
      const existingPlayer = {
        id: '123',
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'olduser',
        total_points: 100,
      };

      const updatedPlayer = {
        ...existingPlayer,
        username: 'newuser',
      };

      vi.mocked(getPlayerByWallet).mockResolvedValueOnce(existingPlayer);
      vi.mocked(createOrUpdatePlayer).mockResolvedValueOnce(updatedPlayer);

      const request = createMockRequest('POST', {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'newuser',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(trackAccountCreated).not.toHaveBeenCalled();
    });

    it('should return validation error for missing wallet address', async () => {
      const request = createMockRequest('POST', {
        username: 'testuser',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
    });

    it('should return validation error for missing username', async () => {
      const request = createMockRequest('POST', {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(getPlayerByWallet).mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const request = createMockRequest('POST', {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'testuser',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Failed to create player profile');
    });
  });

  describe('GET /api/player', () => {
    it('should return player data for valid wallet address', async () => {
      const mockPlayer = {
        id: '123',
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'testuser',
        total_points: 500,
      };

      vi.mocked(getPlayerByWallet).mockResolvedValueOnce(mockPlayer);

      const request = createMockRequest('GET', undefined, {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.player).toEqual(mockPlayer);
    });

    it('should return 404 for non-existent player', async () => {
      vi.mocked(getPlayerByWallet).mockResolvedValueOnce(null);

      const request = createMockRequest('GET', undefined, {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Player not found');
    });

    it('should return validation error for missing wallet address', async () => {
      const request = createMockRequest('GET');

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(getPlayerByWallet).mockRejectedValueOnce(
        new Error('Database error')
      );

      const request = createMockRequest('GET', undefined, {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Failed to get player data');
    });
  });

  describe('PATCH /api/player', () => {
    it('should return 409 when PATCH username is taken by another wallet', async () => {
      const existingPlayer = {
        id: '123',
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'olduser',
        email: 'test@example.com',
        total_points: 500,
      };

      vi.mocked(getPlayerByWallet).mockResolvedValueOnce(existingPlayer);
      vi.mocked(isUsernameTakenByOther).mockResolvedValueOnce(true);

      const request = createMockRequest('PATCH', {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'takenuser',
      });

      const response = await PATCH(request);
      const json = await response.json();

      expect(response.status).toBe(409);
      expect(json.error).toBe('Username is already taken');
      expect(createOrUpdatePlayer).not.toHaveBeenCalled();
    });

    it('should update player username successfully', async () => {
      const existingPlayer = {
        id: '123',
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'olduser',
        email: 'test@example.com',
        total_points: 500,
      };

      const updatedPlayer = {
        ...existingPlayer,
        username: 'newuser',
      };

      vi.mocked(getPlayerByWallet).mockResolvedValueOnce(existingPlayer);
      vi.mocked(createOrUpdatePlayer).mockResolvedValueOnce(updatedPlayer);

      const request = createMockRequest('PATCH', {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'newuser',
      });

      const response = await PATCH(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.player.username).toBe('newuser');
      expect(json.message).toContain('newuser');
    });

    it('should return 404 for non-existent player', async () => {
      vi.mocked(getPlayerByWallet).mockResolvedValueOnce(null);

      const request = createMockRequest('PATCH', {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'newuser',
      });

      const response = await PATCH(request);
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Player not found');
    });

    it('should return validation error for missing fields', async () => {
      const request = createMockRequest('PATCH', {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      });

      const response = await PATCH(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(getPlayerByWallet).mockRejectedValueOnce(
        new Error('Database error')
      );

      const request = createMockRequest('PATCH', {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'newuser',
      });

      const response = await PATCH(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Failed to update player profile');
    });
  });
});

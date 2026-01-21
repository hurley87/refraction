import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET, PATCH } from '../route';

// Mock the database functions
vi.mock('@/lib/db/players', () => ({
  createOrUpdatePlayer: vi.fn(),
  getPlayerByWallet: vi.fn(),
}));

// Mock analytics
vi.mock('@/lib/analytics', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/analytics')>('@/lib/analytics');
  return {
    ...actual,
    trackAccountCreated: vi.fn(),
  };
});

import { createOrUpdatePlayer, getPlayerByWallet } from '@/lib/db/players';
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
        'test@example.com', // Email-first distinct_id
        expect.objectContaining({
          wallet_type: 'EVM',
          has_email: true,
        })
      );
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

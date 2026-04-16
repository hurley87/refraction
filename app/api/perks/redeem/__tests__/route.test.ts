import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock analytics before importing route
vi.mock('@/lib/analytics', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/analytics')>('@/lib/analytics');
  return {
    ...actual,
    trackRewardClaimed: vi.fn(),
  };
});

// Mock the supabase client
const mockSingle = vi.fn();
const mockLimit = vi.fn(() => ({ single: mockSingle }));
const mockInsert = vi.fn(() => ({
  select: vi.fn(() => ({ single: mockSingle })),
}));
const mockEq = vi.fn<any>(() => ({
  single: mockSingle,
  eq: vi.fn<any>(() => ({
    single: mockSingle,
    limit: mockLimit,
  })),
}));
const mockSelect = vi.fn(() => ({
  eq: mockEq,
}));
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
}));

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: () => mockFrom(),
  },
}));

const mockGetPlayerByWallet = vi.fn();
vi.mock('@/lib/db/players', () => ({
  getPlayerByWallet: (...args: unknown[]) => mockGetPlayerByWallet(...args),
}));

import { POST } from '../route';
import { trackRewardClaimed } from '@/lib/analytics';
import { getAddress } from 'viem';

// Helper to create NextRequest with JSON body
function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/perks/redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/perks/redeem', () => {
  const validWallet = '0x1234567890abcdef1234567890abcdef12345678';
  const validPerkId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlayerByWallet.mockResolvedValue({
      wallet_address: validWallet,
      total_points: 500,
      email: undefined,
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for missing perkId', async () => {
      const request = createRequest({ walletAddress: validWallet });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain('perkId');
    });

    it('should return 400 for missing walletAddress', async () => {
      const request = createRequest({ perkId: validPerkId });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain('walletAddress');
    });

    it('should return 400 for invalid perkId format (not UUID)', async () => {
      const request = createRequest({
        perkId: 'not-a-uuid',
        walletAddress: validWallet,
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it('should return 400 for invalid wallet address format', async () => {
      const request = createRequest({
        perkId: validPerkId,
        walletAddress: 'invalid-wallet',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
    });
  });

  describe('Insufficient Points', () => {
    it('should return 400 when user has insufficient points', async () => {
      mockGetPlayerByWallet.mockResolvedValueOnce({
        wallet_address: validWallet,
        total_points: 50,
        email: undefined,
      });
      // Mock perk requiring 500 points
      mockSingle.mockResolvedValueOnce({
        data: {
          id: validPerkId,
          points_threshold: 500,
          type: 'discount',
          location: null,
        },
        error: null,
      });

      const request = createRequest({
        perkId: validPerkId,
        walletAddress: validWallet,
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Insufficient points');
    });

    it('should return 400 when user not found (null user)', async () => {
      mockGetPlayerByWallet.mockResolvedValueOnce(null);

      const request = createRequest({
        perkId: validPerkId,
        walletAddress: validWallet,
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Insufficient points');
    });
  });

  describe('Already Redeemed', () => {
    it('should return 400 when perk already redeemed by user', async () => {
      // Mock perk
      mockSingle.mockResolvedValueOnce({
        data: {
          id: validPerkId,
          points_threshold: 100,
          type: 'discount',
          location: null,
        },
        error: null,
      });
      // Mock existing redemption found
      mockSingle.mockResolvedValueOnce({
        data: { id: 'existing-redemption-id' },
        error: null,
      });

      const request = createRequest({
        perkId: validPerkId,
        walletAddress: validWallet,
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Perk already redeemed');
    });
  });

  describe('No Available Codes', () => {
    it('should return 400 when no discount codes available', async () => {
      // Mock perk
      mockSingle.mockResolvedValueOnce({
        data: {
          id: validPerkId,
          points_threshold: 100,
          type: 'discount',
          location: null,
        },
        error: null,
      });
      // Mock no existing redemption (PGRST116 = not found)
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });
      // Mock no available codes
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const request = createRequest({
        perkId: validPerkId,
        walletAddress: validWallet,
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe('No discount codes available');
    });
  });

  describe('Successful Redemption', () => {
    it('inserts redemption using players.wallet_address casing when request is checksummed', async () => {
      const checksummed = getAddress(validWallet as `0x${string}`);
      mockGetPlayerByWallet.mockResolvedValueOnce({
        wallet_address: validWallet,
        total_points: 500,
        email: undefined,
      });

      const mockRedemption = {
        id: 'redemption-123',
        perk_id: validPerkId,
        discount_code_id: 'code-123',
        user_wallet_address: validWallet,
        created_at: '2024-01-01T00:00:00Z',
        perk_discount_codes: { code: 'SAVE50' },
      };

      mockSingle.mockResolvedValueOnce({
        data: {
          id: validPerkId,
          points_threshold: 100,
          type: 'discount',
          location: 'Partner Store',
        },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'code-123',
          code: 'SAVE50',
          perk_id: validPerkId,
          is_claimed: false,
        },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: mockRedemption,
        error: null,
      });

      const request = createRequest({
        perkId: validPerkId,
        walletAddress: checksummed,
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_wallet_address: validWallet,
        })
      );
    });

    it('should return redemption record with code on success', async () => {
      const mockRedemption = {
        id: 'redemption-123',
        perk_id: validPerkId,
        discount_code_id: 'code-123',
        user_wallet_address: validWallet,
        created_at: '2024-01-01T00:00:00Z',
        perk_discount_codes: { code: 'SAVE50' },
      };

      // Mock perk
      mockSingle.mockResolvedValueOnce({
        data: {
          id: validPerkId,
          points_threshold: 100,
          type: 'discount',
          location: 'Partner Store',
        },
        error: null,
      });
      // Mock no existing redemption (PGRST116 = not found)
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });
      // Mock available code found
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'code-123',
          code: 'SAVE50',
          perk_id: validPerkId,
          is_claimed: false,
        },
        error: null,
      });
      // Mock redemption insert
      mockSingle.mockResolvedValueOnce({
        data: mockRedemption,
        error: null,
      });

      const request = createRequest({
        perkId: validPerkId,
        walletAddress: validWallet,
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.redemption).toEqual(mockRedemption);
      expect(json.data.redemption.perk_discount_codes.code).toBe('SAVE50');
    });

    it('should call trackRewardClaimed on success', async () => {
      const mockRedemption = {
        id: 'redemption-123',
        perk_id: validPerkId,
        discount_code_id: 'code-123',
        user_wallet_address: validWallet,
        perk_discount_codes: { code: 'SAVE50' },
      };

      // Mock perk
      mockSingle.mockResolvedValueOnce({
        data: {
          id: validPerkId,
          points_threshold: 100,
          type: 'exclusive',
          location: 'VIP Partner',
        },
        error: null,
      });
      // Mock no existing redemption
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });
      // Mock available code
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'code-123',
          code: 'SAVE50',
          perk_id: validPerkId,
          is_claimed: false,
        },
        error: null,
      });
      // Mock redemption insert
      mockSingle.mockResolvedValueOnce({
        data: mockRedemption,
        error: null,
      });

      const request = createRequest({
        perkId: validPerkId,
        walletAddress: validWallet,
      });

      await POST(request);

      expect(trackRewardClaimed).toHaveBeenCalledWith(validWallet, {
        reward_id: validPerkId,
        reward_type: 'exclusive',
        partner: 'VIP Partner',
        points_required: 100,
      });
    });
  });

  describe('Database Errors', () => {
    it('should return 400 when insert loses a redemption race', async () => {
      // Mock perk
      mockSingle.mockResolvedValueOnce({
        data: {
          id: validPerkId,
          points_threshold: 100,
          type: 'discount',
          location: null,
        },
        error: null,
      });
      // Mock no existing redemption
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });
      // Mock available code
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'code-123',
          code: 'SAVE50',
          perk_id: validPerkId,
          is_claimed: false,
        },
        error: null,
      });
      // Mock insert conflict from a concurrent request
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint',
        },
      });

      const request = createRequest({
        perkId: validPerkId,
        walletAddress: validWallet,
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Perk already redeemed');
      expect(trackRewardClaimed).not.toHaveBeenCalled();
    });

    it('should return 500 on player lookup failure', async () => {
      mockGetPlayerByWallet.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const request = createRequest({
        perkId: validPerkId,
        walletAddress: validWallet,
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Failed to redeem perk');
    });

    it('should return 500 on perk fetch error', async () => {
      // Mock perk fetch error
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const request = createRequest({
        perkId: validPerkId,
        walletAddress: validWallet,
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Failed to redeem perk');
    });

    it('should return 500 on redemption insert error', async () => {
      // Mock perk
      mockSingle.mockResolvedValueOnce({
        data: {
          id: validPerkId,
          points_threshold: 100,
          type: 'discount',
          location: null,
        },
        error: null,
      });
      // Mock no existing redemption
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });
      // Mock available code
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'code-123',
          code: 'SAVE50',
          perk_id: validPerkId,
          is_claimed: false,
        },
        error: null,
      });
      // Mock insert error
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' },
      });

      const request = createRequest({
        perkId: validPerkId,
        walletAddress: validWallet,
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Failed to redeem perk');
    });
  });
});

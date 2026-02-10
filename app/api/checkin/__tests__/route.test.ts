import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

// Mock the database functions
vi.mock('@/lib/db/players', () => ({
  createOrUpdatePlayer: vi.fn(),
  createOrUpdatePlayerForSolana: vi.fn(),
  createOrUpdatePlayerForStellar: vi.fn(),
  createOrUpdatePlayerForAptos: vi.fn(),
  updatePlayerPoints: vi.fn(),
}));

vi.mock('@/lib/db/profiles', () => ({
  getUserProfile: vi.fn(),
}));

// Mock Supabase client
const mockSupabaseFrom = vi.fn();
vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: () => mockSupabaseFrom(),
  },
}));

// Mock analytics
vi.mock('@/lib/analytics', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/analytics')>('@/lib/analytics');
  return {
    ...actual,
    trackCheckinCompleted: vi.fn(),
    trackPointsEarned: vi.fn(),
  };
});

import {
  createOrUpdatePlayer,
  createOrUpdatePlayerForSolana,
  createOrUpdatePlayerForStellar,
  createOrUpdatePlayerForAptos,
  updatePlayerPoints,
} from '@/lib/db/players';
import { trackCheckinCompleted, trackPointsEarned } from '@/lib/analytics';

// Helper to create a mock NextRequest
function createMockRequest(body: object): NextRequest {
  const url = new URL('http://localhost:3000/api/checkin');
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// Helper to create mock Supabase chain
function createMockSupabaseChain(options: {
  selectCount?: number | null;
  selectError?: Error | null;
  insertData?: object | null;
  insertError?: Error | null;
  sumData?: { points_earned: number }[] | null;
  sumError?: Error | null;
}) {
  const chainMethods = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  // Default successful flow
  let callCount = 0;
  mockSupabaseFrom.mockImplementation(() => {
    callCount++;

    // First call: count checkpoint checkins today
    if (callCount === 1) {
      return {
        ...chainMethods,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({
                  count: options.selectCount ?? 0,
                  error: options.selectError ?? null,
                }),
              }),
            }),
          }),
        }),
      };
    }

    // Second call: insert activity
    if (callCount === 2) {
      return {
        ...chainMethods,
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: options.insertData ?? { id: 'activity-123' },
              error: options.insertError ?? null,
            }),
          }),
        }),
      };
    }

    // Third call: get today's checkpoints sum
    if (callCount === 3) {
      return {
        ...chainMethods,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({
                  data: options.sumData ?? [{ points_earned: 100 }],
                  error: options.sumError ?? null,
                }),
              }),
            }),
          }),
        }),
      };
    }

    return chainMethods;
  });
}

describe('Checkin API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/checkin', () => {
    it('should successfully process a checkin', async () => {
      const mockPlayer = {
        id: '123',
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'testuser',
        total_points: 0,
      };

      const updatedPlayer = {
        ...mockPlayer,
        total_points: 100,
      };

      vi.mocked(createOrUpdatePlayer).mockResolvedValueOnce(mockPlayer);
      vi.mocked(updatePlayerPoints).mockResolvedValueOnce(updatedPlayer);

      createMockSupabaseChain({
        selectCount: 0,
        insertData: { id: 'activity-123' },
        sumData: [{ points_earned: 100 }],
      });

      const request = createMockRequest({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: 'checkpoint-abc',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.pointsAwarded).toBe(100);
      expect(json.data.player).toBeDefined();
      expect(json.message).toContain('100 points');

      // Check that trackCheckinCompleted was called with email-first distinct_id
      // The distinct_id will be the email if provided, otherwise player.id or wallet
      expect(trackCheckinCompleted).toHaveBeenCalledWith(
        expect.any(String), // distinct_id resolved from email/wallet/playerId
        expect.objectContaining({
          checkpoint: 'checkpoint-abc',
          points: 100,
          checkin_type: 'checkpoint',
          chain: 'evm',
        })
      );

      // Check that trackPointsEarned was called with email-first distinct_id
      expect(trackPointsEarned).toHaveBeenCalledWith(
        expect.any(String), // distinct_id resolved from email/wallet/playerId
        expect.objectContaining({
          activity_type: 'checkpoint_checkin',
          amount: 100,
          chain: 'evm',
        })
      );
    });

    it('should return 429 when daily checkpoint limit is reached', async () => {
      const mockPlayer = {
        id: '123',
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        total_points: 900,
      };

      vi.mocked(createOrUpdatePlayer).mockResolvedValueOnce(mockPlayer);

      createMockSupabaseChain({
        selectCount: 10, // Daily limit reached
      });

      const request = createMockRequest({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: 'checkpoint-abc',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(429);
      expect(json.success).toBe(false);
      expect(json.error).toContain('Daily checkpoint limit');
    });

    it('should return validation error for missing wallet address', async () => {
      const request = createMockRequest({
        checkpoint: 'checkpoint-abc',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it('should return validation error for missing checkpoint', async () => {
      const request = createMockRequest({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(createOrUpdatePlayer).mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const request = createMockRequest({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: 'checkpoint-abc',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
    });

    it('should include email in checkin when provided', async () => {
      const mockPlayer = {
        id: '123',
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        email: 'test@example.com',
        total_points: 0,
      };

      vi.mocked(createOrUpdatePlayer).mockResolvedValueOnce(mockPlayer);
      vi.mocked(updatePlayerPoints).mockResolvedValueOnce({
        ...mockPlayer,
        total_points: 100,
      });

      createMockSupabaseChain({
        selectCount: 0,
        insertData: { id: 'activity-123' },
        sumData: [{ points_earned: 100 }],
      });

      const request = createMockRequest({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: 'checkpoint-abc',
        email: 'test@example.com',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it('should calculate cumulative points earned today', async () => {
      const mockPlayer = {
        id: '123',
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        total_points: 200,
      };

      vi.mocked(createOrUpdatePlayer).mockResolvedValueOnce(mockPlayer);
      vi.mocked(updatePlayerPoints).mockResolvedValueOnce({
        ...mockPlayer,
        total_points: 300,
      });

      createMockSupabaseChain({
        selectCount: 2, // 2 previous checkins today
        insertData: { id: 'activity-123' },
        sumData: [
          { points_earned: 100 },
          { points_earned: 100 },
          { points_earned: 100 },
        ], // 300 total today
      });

      const request = createMockRequest({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: 'checkpoint-abc',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.pointsEarnedToday).toBe(300);
    });

    it('should support unified format with chain parameter for EVM', async () => {
      const mockPlayer = {
        id: '123',
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        total_points: 0,
      };

      vi.mocked(createOrUpdatePlayer).mockResolvedValueOnce(mockPlayer);
      vi.mocked(updatePlayerPoints).mockResolvedValueOnce({
        ...mockPlayer,
        total_points: 100,
      });

      createMockSupabaseChain({
        selectCount: 0,
        insertData: { id: 'activity-123' },
        sumData: [{ points_earned: 100 }],
      });

      const request = createMockRequest({
        chain: 'evm',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: 'checkpoint-abc',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(createOrUpdatePlayer).toHaveBeenCalled();
    });

    it('should support Solana chain checkin', async () => {
      // Valid Solana address: base58, exactly 44 characters
      const validSolanaAddress = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM6';
      const mockPlayer = {
        id: '123',
        solana_wallet_address: validSolanaAddress,
        total_points: 0,
      };

      vi.mocked(createOrUpdatePlayerForSolana).mockResolvedValueOnce(
        mockPlayer
      );
      vi.mocked(updatePlayerPoints).mockResolvedValueOnce({
        ...mockPlayer,
        total_points: 100,
      });

      createMockSupabaseChain({
        selectCount: 0,
        insertData: { id: 'activity-123' },
        sumData: [{ points_earned: 100 }],
      });

      const request = createMockRequest({
        chain: 'solana',
        walletAddress: validSolanaAddress,
        checkpoint: 'checkpoint-abc',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(createOrUpdatePlayerForSolana).toHaveBeenCalledWith(
        validSolanaAddress,
        undefined
      );
    });

    it('should support Stellar chain checkin', async () => {
      // Valid Stellar address: G + exactly 55 base32 characters (A-Z0-9) = 56 total
      const validStellarAddress =
        'GABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABC';
      const mockPlayer = {
        id: '123',
        stellar_wallet_address: validStellarAddress,
        total_points: 0,
      };

      vi.mocked(createOrUpdatePlayerForStellar).mockResolvedValueOnce(
        mockPlayer
      );
      vi.mocked(updatePlayerPoints).mockResolvedValueOnce({
        ...mockPlayer,
        total_points: 100,
      });

      createMockSupabaseChain({
        selectCount: 0,
        insertData: { id: 'activity-123' },
        sumData: [{ points_earned: 100 }],
      });

      const request = createMockRequest({
        chain: 'stellar',
        walletAddress: validStellarAddress,
        checkpoint: 'checkpoint-abc',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(createOrUpdatePlayerForStellar).toHaveBeenCalledWith(
        validStellarAddress,
        undefined
      );
    });

    it('should return error for unsupported chain type', async () => {
      const request = createMockRequest({
        chain: 'unsupported',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: 'checkpoint-abc',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      // Should reject due to invalid chain parameter, not silently default to EVM
      // The error should come from validation, not from the switch statement
      expect(json.error).toBeDefined();
    });

    it('should maintain backward compatibility with legacy format', async () => {
      const mockPlayer = {
        id: '123',
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        total_points: 0,
      };

      vi.mocked(createOrUpdatePlayer).mockResolvedValueOnce(mockPlayer);
      vi.mocked(updatePlayerPoints).mockResolvedValueOnce({
        ...mockPlayer,
        total_points: 100,
      });

      createMockSupabaseChain({
        selectCount: 0,
        insertData: { id: 'activity-123' },
        sumData: [{ points_earned: 100 }],
      });

      // Legacy format without chain parameter (should default to EVM)
      const request = createMockRequest({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: 'checkpoint-abc',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(createOrUpdatePlayer).toHaveBeenCalled();
    });

    it('should reject invalid EVM wallet address format', async () => {
      const request = createMockRequest({
        chain: 'evm',
        walletAddress: 'invalid-address',
        checkpoint: 'checkpoint-abc',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain('Invalid EVM wallet address');
    });

    it('should reject invalid Solana wallet address format', async () => {
      const request = createMockRequest({
        chain: 'solana',
        walletAddress: 'invalid-solana-address',
        checkpoint: 'checkpoint-abc',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain('Invalid Solana wallet address');
    });

    it('should reject invalid Stellar wallet address format', async () => {
      const request = createMockRequest({
        chain: 'stellar',
        walletAddress: 'invalid-stellar-address',
        checkpoint: 'checkpoint-abc',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain('Invalid Stellar wallet address');
    });

    it('should reject request with invalid chain parameter even if wallet address is valid EVM', async () => {
      const request = createMockRequest({
        chain: 'unsupported',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: 'checkpoint-abc',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      // Should reject due to invalid chain, not silently default to EVM
      expect(json.error).toBeDefined();
    });

    it('should accept valid EVM wallet address with evm chain', async () => {
      const mockPlayer = {
        id: '123',
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        total_points: 0,
      };

      vi.mocked(createOrUpdatePlayer).mockResolvedValueOnce(mockPlayer);
      vi.mocked(updatePlayerPoints).mockResolvedValueOnce({
        ...mockPlayer,
        total_points: 100,
      });

      createMockSupabaseChain({
        selectCount: 0,
        insertData: { id: 'activity-123' },
        sumData: [{ points_earned: 100 }],
      });

      const request = createMockRequest({
        chain: 'evm',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        checkpoint: 'checkpoint-abc',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it('should accept valid Solana wallet address with solana chain', async () => {
      // Valid Solana address: base58, exactly 44 characters
      const validSolanaAddress = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM6';
      const mockPlayer = {
        id: '123',
        solana_wallet_address: validSolanaAddress,
        total_points: 0,
      };

      vi.mocked(createOrUpdatePlayerForSolana).mockResolvedValueOnce(
        mockPlayer
      );
      vi.mocked(updatePlayerPoints).mockResolvedValueOnce({
        ...mockPlayer,
        total_points: 100,
      });

      createMockSupabaseChain({
        selectCount: 0,
        insertData: { id: 'activity-123' },
        sumData: [{ points_earned: 100 }],
      });

      const request = createMockRequest({
        chain: 'solana',
        walletAddress: validSolanaAddress,
        checkpoint: 'checkpoint-abc',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it('should accept valid Stellar wallet address with stellar chain', async () => {
      // Valid Stellar address: G + exactly 55 base32 characters (A-Z0-9) = 56 total
      const validStellarAddress =
        'GABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABC';
      const mockPlayer = {
        id: '123',
        stellar_wallet_address: validStellarAddress,
        total_points: 0,
      };

      vi.mocked(createOrUpdatePlayerForStellar).mockResolvedValueOnce(
        mockPlayer
      );
      vi.mocked(updatePlayerPoints).mockResolvedValueOnce({
        ...mockPlayer,
        total_points: 100,
      });

      createMockSupabaseChain({
        selectCount: 0,
        insertData: { id: 'activity-123' },
        sumData: [{ points_earned: 100 }],
      });

      const request = createMockRequest({
        chain: 'stellar',
        walletAddress: validStellarAddress,
        checkpoint: 'checkpoint-abc',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it('should support Aptos chain checkin', async () => {
      // Valid Aptos address: 0x followed by 64 hex characters
      const validAptosAddress =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const mockPlayer = {
        id: '123',
        aptos_wallet_address: validAptosAddress,
        total_points: 0,
      };

      vi.mocked(createOrUpdatePlayerForAptos).mockResolvedValueOnce(mockPlayer);
      vi.mocked(updatePlayerPoints).mockResolvedValueOnce({
        ...mockPlayer,
        total_points: 100,
      });

      createMockSupabaseChain({
        selectCount: 0,
        insertData: { id: 'activity-123' },
        sumData: [{ points_earned: 100 }],
      });

      const request = createMockRequest({
        chain: 'aptos',
        walletAddress: validAptosAddress,
        checkpoint: 'checkpoint-abc',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(createOrUpdatePlayerForAptos).toHaveBeenCalledWith(
        validAptosAddress,
        undefined
      );
    });

    it('should reject invalid Aptos wallet address format', async () => {
      const request = createMockRequest({
        chain: 'aptos',
        walletAddress: 'invalid-aptos-address',
        checkpoint: 'checkpoint-abc',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain('Invalid Aptos wallet address');
    });

    it('should accept valid Aptos wallet address with aptos chain', async () => {
      // Valid Aptos address: 0x followed by 64 hex characters
      const validAptosAddress =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const mockPlayer = {
        id: '123',
        aptos_wallet_address: validAptosAddress,
        total_points: 0,
      };

      vi.mocked(createOrUpdatePlayerForAptos).mockResolvedValueOnce(mockPlayer);
      vi.mocked(updatePlayerPoints).mockResolvedValueOnce({
        ...mockPlayer,
        total_points: 100,
      });

      createMockSupabaseChain({
        selectCount: 0,
        insertData: { id: 'activity-123' },
        sumData: [{ points_earned: 100 }],
      });

      const request = createMockRequest({
        chain: 'aptos',
        walletAddress: validAptosAddress,
        checkpoint: 'checkpoint-abc',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });
  });
});

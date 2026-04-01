import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockVerifyWalletOwnership,
  mockGetPlayerByWallet,
  mockUpdatePlayerPoints,
  mockSupabaseInsert,
  mockSupabaseLimit,
  mockSupabaseEqActivityType,
  mockSupabaseEqWallet,
  mockSupabaseSelect,
  mockSupabaseFrom,
} = vi.hoisted(() => ({
  mockVerifyWalletOwnership: vi.fn(),
  mockGetPlayerByWallet: vi.fn(),
  mockUpdatePlayerPoints: vi.fn(),
  mockSupabaseInsert: vi.fn(),
  mockSupabaseLimit: vi.fn(),
  mockSupabaseEqActivityType: vi.fn(),
  mockSupabaseEqWallet: vi.fn(),
  mockSupabaseSelect: vi.fn(),
  mockSupabaseFrom: vi.fn(),
}));

vi.mock('@/lib/api/privy', () => ({
  verifyWalletOwnership: mockVerifyWalletOwnership,
}));

vi.mock('@/lib/db/players', () => ({
  getPlayerByWallet: mockGetPlayerByWallet,
  updatePlayerPoints: mockUpdatePlayerPoints,
}));

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

import { POST } from '../route';

const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';

function createRequest(body: unknown) {
  return new NextRequest(
    'http://localhost:3000/api/claim/walletcon-checkin-points',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
      body: JSON.stringify(body),
    }
  );
}

describe('/api/claim/walletcon-checkin-points', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table !== 'points_activities') {
        throw new Error(`Unexpected table ${table}`);
      }
      return {
        select: (...args: unknown[]) => mockSupabaseSelect(...args),
        insert: (...args: unknown[]) => mockSupabaseInsert(...args),
      };
    });

    mockSupabaseSelect.mockReturnValue({
      eq: (...args: unknown[]) => mockSupabaseEqWallet(...args),
    });

    mockSupabaseEqWallet.mockReturnValue({
      eq: (...args: unknown[]) => mockSupabaseEqActivityType(...args),
    });

    mockSupabaseEqActivityType.mockReturnValue({
      limit: (...args: unknown[]) => mockSupabaseLimit(...args),
    });
  });

  it('is idempotent when unique index rejects duplicate insert', async () => {
    mockVerifyWalletOwnership.mockResolvedValue({ authorized: true });
    mockGetPlayerByWallet
      .mockResolvedValueOnce({
        id: 10,
        wallet_address: walletAddress,
        total_points: 300,
      })
      .mockResolvedValueOnce(null);
    mockSupabaseLimit.mockResolvedValue({ data: [], error: null });
    mockSupabaseInsert.mockResolvedValue({
      error: { code: '23505', message: 'duplicate key value' },
    });

    const response = await POST(createRequest({ walletAddress }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({
      pointsAwarded: 0,
      alreadyAwarded: true,
      totalPoints: 300,
    });
    expect(mockUpdatePlayerPoints).not.toHaveBeenCalled();
  });

  it('falls back to legacy insert when idempotency_key column is missing', async () => {
    mockVerifyWalletOwnership.mockResolvedValue({ authorized: true });
    mockGetPlayerByWallet
      .mockResolvedValueOnce({
        id: 10,
        wallet_address: walletAddress,
        total_points: 300,
      })
      .mockResolvedValueOnce(null);
    mockSupabaseLimit.mockResolvedValue({ data: [], error: null });
    mockSupabaseInsert
      .mockResolvedValueOnce({
        error: { code: '42703', message: 'column does not exist' },
      })
      .mockResolvedValueOnce({ error: null });
    mockUpdatePlayerPoints.mockResolvedValue({ total_points: 400 });

    const response = await POST(createRequest({ walletAddress }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({
      pointsAwarded: 100,
      alreadyAwarded: false,
      totalPoints: 400,
    });
    expect(mockSupabaseInsert).toHaveBeenCalledTimes(2);
    expect(mockUpdatePlayerPoints).toHaveBeenCalledWith(10, 100);
  });
});

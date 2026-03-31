import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockVerifyWalletOwnership = vi.fn();
const mockGetPlayerByWallet = vi.fn();
const mockUpdatePlayerPoints = vi.fn();
const mockDeleteEq = vi.fn();
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }));
const mockInsertSingle = vi.fn();
const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }));
const mockInsert = vi.fn(() => ({ select: mockInsertSelect }));
const mockFrom = vi.fn((table: string) => {
  if (table !== 'points_activities') {
    throw new Error(`Unexpected table: ${table}`);
  }
  return {
    insert: mockInsert,
    delete: mockDelete,
  };
});

vi.mock('@/lib/api/privy', () => ({
  verifyWalletOwnership: mockVerifyWalletOwnership,
}));

vi.mock('@/lib/db/players', () => ({
  getPlayerByWallet: mockGetPlayerByWallet,
  updatePlayerPoints: mockUpdatePlayerPoints,
}));

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: mockFrom,
  },
}));

const validWallet = '0x1234567890abcdef1234567890abcdef12345678';

function createRequest(walletAddress: string = validWallet) {
  return new NextRequest('http://localhost:3000/api/claim/walletcon-mint-points', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
    },
    body: JSON.stringify({ walletAddress }),
  });
}

describe('/api/claim/walletcon-mint-points', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyWalletOwnership.mockResolvedValue({ authorized: true });
    mockGetPlayerByWallet.mockResolvedValue({
      id: 42,
      wallet_address: validWallet,
      total_points: 900,
    });
    mockDeleteEq.mockResolvedValue({ error: null });
  });

  it('returns alreadyAwarded when insert hits unique violation', async () => {
    mockInsertSingle.mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    });

    const { POST } = await import('../route');
    const response = await POST(createRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({
      pointsAwarded: 0,
      alreadyAwarded: true,
      totalPoints: 900,
    });
    expect(mockUpdatePlayerPoints).not.toHaveBeenCalled();
  });

  it('rolls back inserted activity when points update fails', async () => {
    mockInsertSingle.mockResolvedValue({
      data: { id: 'activity-mint-id' },
      error: null,
    });
    mockUpdatePlayerPoints.mockRejectedValue(new Error('rpc unavailable'));

    const { POST } = await import('../route');
    const response = await POST(createRequest());
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Failed to award mint points');
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'activity-mint-id');
  });

  it('awards points successfully on first insert', async () => {
    mockInsertSingle.mockResolvedValue({
      data: { id: 'activity-mint-id' },
      error: null,
    });
    mockUpdatePlayerPoints.mockResolvedValue({
      id: 42,
      wallet_address: validWallet,
      total_points: 1000,
    });

    const { POST } = await import('../route');
    const response = await POST(createRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({
      pointsAwarded: 100,
      alreadyAwarded: false,
      totalPoints: 1000,
    });
    expect(mockUpdatePlayerPoints).toHaveBeenCalledTimes(1);
  });
});

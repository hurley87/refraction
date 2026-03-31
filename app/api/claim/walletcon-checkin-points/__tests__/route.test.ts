import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { verifyWalletOwnership } from '@/lib/api/privy';
import { getPlayerByWallet, updatePlayerPoints } from '@/lib/db/players';

const mockLookupLimit = vi.fn();
const mockLookupEqActivity = vi.fn(() => ({ limit: mockLookupLimit }));
const mockLookupIlike = vi.fn(() => ({ eq: mockLookupEqActivity }));
const mockSelect = vi.fn(() => ({ ilike: mockLookupIlike }));

const mockInsertSingle = vi.fn();
const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }));
const mockInsert = vi.fn(() => ({ select: mockInsertSelect }));

const mockDeleteEq = vi.fn();
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }));

vi.mock('@/lib/api/privy', () => ({
  verifyWalletOwnership: vi.fn(),
}));

vi.mock('@/lib/db/players', () => ({
  getPlayerByWallet: vi.fn(),
  updatePlayerPoints: vi.fn(),
}));

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      delete: mockDelete,
    })),
  },
}));

function createRequest(walletAddress = '0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD') {
  return new NextRequest(
    'http://localhost:3000/api/claim/walletcon-checkin-points',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletAddress }),
    }
  );
}

describe('POST /api/claim/walletcon-checkin-points', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(verifyWalletOwnership).mockResolvedValue({ authorized: true });
    vi.mocked(getPlayerByWallet).mockResolvedValue({
      id: 42,
      wallet_address: '0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD',
      total_points: 500,
    } as any);
    mockLookupLimit.mockResolvedValue({ data: [], error: null });
    mockInsertSingle.mockResolvedValue({ data: { id: 'activity-1' }, error: null });
    vi.mocked(updatePlayerPoints).mockResolvedValue({
      id: 42,
      total_points: 600,
    } as any);
    mockDeleteEq.mockResolvedValue({ error: null });
  });

  it('returns alreadyAwarded when unique index blocks duplicate insert', async () => {
    mockInsertSingle.mockResolvedValueOnce({
      data: null,
      error: {
        code: '23505',
        message:
          'duplicate key value violates unique constraint "idx_points_activities_walletcon_one_time_unique"',
      },
    });

    const response = await POST(createRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.pointsAwarded).toBe(0);
    expect(json.data.alreadyAwarded).toBe(true);
    expect(updatePlayerPoints).not.toHaveBeenCalled();
  });

  it('rolls back inserted activity when points increment fails', async () => {
    vi.mocked(updatePlayerPoints).mockRejectedValueOnce(
      new Error('increment failed')
    );

    const response = await POST(createRequest());
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'activity-1');
    expect(mockLookupIlike).toHaveBeenCalledWith(
      'user_wallet_address',
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
    );
  });
});

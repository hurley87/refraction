import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockUpdatePlayerPoints,
  mockSingle,
  mockLimit,
  mockFrom,
  mockRpc,
  mockInsert,
  mockUpdate,
} = vi.hoisted(() => {
  const single = vi.fn();
  const limit = vi.fn();
  const queryBuilder = {
    select: vi.fn(() => queryBuilder),
    eq: vi.fn(() => queryBuilder),
    order: vi.fn(() => queryBuilder),
    limit,
    single,
  };

  const insert = vi.fn(() => ({
    select: vi.fn(() => ({ single })),
  }));

  const update = vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({ select: vi.fn(() => ({ single })) })),
    })),
  }));

  const from = vi.fn(() => ({
    ...queryBuilder,
    insert,
    update,
  }));

  return {
    mockUpdatePlayerPoints: vi.fn(),
    mockSingle: single,
    mockLimit: limit,
    mockFrom: from,
    mockRpc: vi.fn(),
    mockInsert: insert,
    mockUpdate: update,
  };
});

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

vi.mock('@/lib/db/players', () => ({
  getPlayerByWallet: vi.fn(),
  updatePlayerPoints: mockUpdatePlayerPoints,
}));

import {
  createPendingSpendRedemption,
  redeemSpendItemOnce,
  verifySpendRedemption,
} from '../spend';
import { getPlayerByWallet } from '../players';

const wallet = '0x1234567890abcdef1234567890abcdef12345678';
const itemId = '550e8400-e29b-41d4-a716-446655440000';
const redemptionId = '660e8400-e29b-41d4-a716-446655440001';

describe('createPendingSpendRedemption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue({ data: [], error: null });
  });

  it('creates pending redemption without deducting points', async () => {
    const item = { id: itemId, points_cost: 100, is_active: true };
    const player = { id: 1, wallet_address: wallet, total_points: 500 };
    const redemption = {
      id: redemptionId,
      spend_item_id: itemId,
      user_wallet_address: wallet,
      points_spent: 100,
      is_fulfilled: false,
    };

    vi.mocked(getPlayerByWallet).mockResolvedValue(player as any);
    mockSingle
      .mockResolvedValueOnce({ data: item, error: null })
      .mockResolvedValueOnce({ data: redemption, error: null });

    const result = await createPendingSpendRedemption(itemId, wallet);

    expect(result).toEqual(redemption);
    expect(mockUpdatePlayerPoints).not.toHaveBeenCalled();
  });

  it('throws when user already redeemed this item', async () => {
    const item = { id: itemId, points_cost: 100, is_active: true };
    const player = { id: 1, wallet_address: wallet, total_points: 500 };

    vi.mocked(getPlayerByWallet).mockResolvedValue(player as any);
    mockSingle.mockResolvedValueOnce({ data: item, error: null });
    mockLimit.mockResolvedValueOnce({
      data: [{ id: redemptionId, is_fulfilled: true }],
      error: null,
    });

    await expect(createPendingSpendRedemption(itemId, wallet)).rejects.toThrow(
      'already redeemed'
    );
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe('verifySpendRedemption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue({ data: [], error: null });
  });

  it('deducts points and marks fulfilled for valid pending redemption', async () => {
    const redemption = {
      id: redemptionId,
      spend_item_id: itemId,
      user_wallet_address: wallet,
      points_spent: 100,
      is_fulfilled: false,
      spend_items: { id: itemId, is_active: true },
    };
    const player = { id: 1, wallet_address: wallet, total_points: 200 };
    const updatedPlayer = { id: 1, wallet_address: wallet, total_points: 100 };
    const updatedRedemption = {
      ...redemption,
      is_fulfilled: true,
      fulfilled_at: new Date().toISOString(),
      verified_by: 'user',
    };

    mockSingle
      .mockResolvedValueOnce({ data: redemption, error: null })
      .mockResolvedValueOnce({ data: updatedRedemption, error: null });
    mockUpdatePlayerPoints.mockResolvedValue(updatedPlayer);
    vi.mocked(getPlayerByWallet).mockResolvedValue(player as any);

    const result = await verifySpendRedemption(redemptionId, wallet);

    expect(result.is_fulfilled).toBe(true);
    expect(mockUpdatePlayerPoints).toHaveBeenCalledWith(1, -100);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('throws when redemption already verified', async () => {
    const redemption = {
      id: redemptionId,
      user_wallet_address: wallet,
      points_spent: 100,
      is_fulfilled: true,
      spend_items: { id: itemId, is_active: true },
    };
    mockSingle.mockResolvedValueOnce({ data: redemption, error: null });

    await expect(verifySpendRedemption(redemptionId, wallet)).rejects.toThrow(
      'already verified'
    );
    expect(mockUpdatePlayerPoints).not.toHaveBeenCalled();
  });

  it('throws when wallet does not own redemption', async () => {
    const otherWallet = '0xabcdef1234567890abcdef1234567890abcdef12';
    const redemption = {
      id: redemptionId,
      user_wallet_address: wallet,
      points_spent: 100,
      is_fulfilled: false,
      spend_items: { id: itemId, is_active: true },
    };
    mockSingle.mockResolvedValueOnce({ data: redemption, error: null });

    await expect(
      verifySpendRedemption(redemptionId, otherWallet)
    ).rejects.toThrow('Unauthorized');
    expect(mockUpdatePlayerPoints).not.toHaveBeenCalled();
  });
});

describe('redeemSpendItemOnce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redeems via atomic RPC and returns redemption + player', async () => {
    const redemption = {
      id: redemptionId,
      spend_item_id: itemId,
      user_wallet_address: wallet,
      points_spent: 100,
      is_fulfilled: true,
      spend_items: { id: itemId, is_active: true },
    };
    const player = { id: 1, wallet_address: wallet, total_points: 100 };

    mockRpc.mockResolvedValue({
      data: [{ redemption_id: redemptionId, player_id: 1, player_total_points: 100 }],
      error: null,
    });
    mockSingle.mockResolvedValueOnce({ data: redemption, error: null });
    vi.mocked(getPlayerByWallet).mockResolvedValue(player as any);

    const result = await redeemSpendItemOnce(itemId, wallet);

    expect(mockRpc).toHaveBeenCalledWith('redeem_spend_item_once_atomic', {
      p_spend_item_id: itemId,
      p_wallet_address: wallet,
    });
    expect(result.redemption).toEqual(redemption);
    expect(result.player).toEqual(player);
  });

  it('falls back to legacy redemption flow when atomic RPC is missing', async () => {
    const item = { id: itemId, points_cost: 100, is_active: true };
    const player = { id: 1, wallet_address: wallet, total_points: 200 };
    const updatedPlayer = { id: 1, wallet_address: wallet, total_points: 100 };
    const redemption = {
      id: redemptionId,
      spend_item_id: itemId,
      user_wallet_address: wallet,
      points_spent: 100,
      is_fulfilled: true,
      spend_items: { id: itemId, is_active: true },
    };

    mockRpc.mockResolvedValue({
      data: null,
      error: {
        message:
          'Could not find the function public.redeem_spend_item_once_atomic(p_spend_item_id, p_wallet_address)',
        code: 'PGRST202',
      },
    });
    mockSingle
      .mockResolvedValueOnce({ data: item, error: null })
      .mockResolvedValueOnce({ data: redemption, error: null });
    mockUpdatePlayerPoints.mockResolvedValue(updatedPlayer);
    vi.mocked(getPlayerByWallet).mockResolvedValue(player as any);

    const result = await redeemSpendItemOnce(itemId, wallet);

    expect(mockInsert).toHaveBeenCalled();
    expect(mockUpdatePlayerPoints).toHaveBeenCalledWith(1, -100);
    expect(result.redemption).toEqual(redemption);
    expect(result.player).toEqual(updatedPlayer);
  });

  it('maps known RPC errors to user-friendly errors', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Insufficient points', code: 'P0001' },
    });

    await expect(redeemSpendItemOnce(itemId, wallet)).rejects.toThrow(
      'Insufficient points'
    );
  });
});

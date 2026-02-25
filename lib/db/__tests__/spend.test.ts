import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockUpdatePlayerPoints, mockSingle, mockFrom } = vi.hoisted(() => {
  const single = vi.fn();
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const insert = vi.fn(() => ({
    select: vi.fn(() => ({ single })),
  }));
  const update = vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({ select: vi.fn(() => ({ single })) })),
    })),
  }));
  const from = vi.fn(() => ({
    select,
    insert,
    update,
  }));
  return {
    mockUpdatePlayerPoints: vi.fn(),
    mockSingle: single,
    mockEq: eq,
    mockFrom: from,
  };
});

vi.mock('@/lib/db/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

vi.mock('@/lib/db/players', () => ({
  getPlayerByWallet: vi.fn(),
  updatePlayerPoints: mockUpdatePlayerPoints,
}));

import { createPendingSpendRedemption, verifySpendRedemption } from '../spend';
import { getPlayerByWallet } from '../players';

const wallet = '0x1234567890abcdef1234567890abcdef12345678';
const itemId = '550e8400-e29b-41d4-a716-446655440000';
const redemptionId = '660e8400-e29b-41d4-a716-446655440001';

describe('createPendingSpendRedemption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('throws when item is inactive', async () => {
    const item = { id: itemId, points_cost: 100, is_active: false };
    vi.mocked(getPlayerByWallet).mockResolvedValue({
      id: 1,
      wallet_address: wallet,
      total_points: 500,
    } as any);
    mockSingle.mockResolvedValueOnce({ data: item, error: null });

    await expect(createPendingSpendRedemption(itemId, wallet)).rejects.toThrow(
      'no longer available'
    );
  });

  it('throws when player not found', async () => {
    const item = { id: itemId, points_cost: 100, is_active: true };
    vi.mocked(getPlayerByWallet).mockResolvedValue(null);
    mockSingle.mockResolvedValueOnce({ data: item, error: null });

    await expect(createPendingSpendRedemption(itemId, wallet)).rejects.toThrow(
      'Player not found'
    );
  });
});

describe('verifySpendRedemption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    mockEq.mockReturnValue({ single: mockSingle });
    mockSingle
      .mockResolvedValueOnce({ data: redemption, error: null })
      .mockResolvedValueOnce({ data: updatedRedemption, error: null });
    mockUpdatePlayerPoints.mockResolvedValue(updatedPlayer);

    vi.mocked(getPlayerByWallet).mockResolvedValue(player as any);

    const result = await verifySpendRedemption(redemptionId, wallet);

    expect(result.is_fulfilled).toBe(true);
    expect(mockUpdatePlayerPoints).toHaveBeenCalledWith(1, -100);
  });

  it('throws when redemption already verified (idempotent)', async () => {
    const redemption = {
      id: redemptionId,
      user_wallet_address: wallet,
      points_spent: 100,
      is_fulfilled: true,
    };
    mockEq.mockReturnValue({ single: mockSingle });
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
    };
    mockEq.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValueOnce({ data: redemption, error: null });

    await expect(
      verifySpendRedemption(redemptionId, otherWallet)
    ).rejects.toThrow('Unauthorized');

    expect(mockUpdatePlayerPoints).not.toHaveBeenCalled();
  });

  it('throws when insufficient points at verify time', async () => {
    const redemption = {
      id: redemptionId,
      user_wallet_address: wallet,
      points_spent: 100,
      is_fulfilled: false,
      spend_items: { id: itemId, is_active: true },
    };
    const player = { id: 1, wallet_address: wallet, total_points: 50 };

    mockEq.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValueOnce({ data: redemption, error: null });
    vi.mocked(getPlayerByWallet).mockResolvedValue(player as any);

    await expect(verifySpendRedemption(redemptionId, wallet)).rejects.toThrow(
      'Insufficient points'
    );

    expect(mockUpdatePlayerPoints).not.toHaveBeenCalled();
  });
});

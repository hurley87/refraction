import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockVerifyWallet = vi.fn();
const mockGetPrivyUserId = vi.fn();
const mockGetActivation = vi.fn();
const mockGetRedemptionById = vi.fn();
const mockGetRewardItem = vi.fn();
const mockConfirmRpc = vi.fn();
const mockGetPlayerByWallet = vi.fn();
const mockCreateOrUpdatePlayer = vi.fn();

vi.mock('@/lib/api/privy', () => ({
  verifyWalletOwnership: (...a: unknown[]) => mockVerifyWallet(...a),
  getPrivyUserIdFromRequest: (...a: unknown[]) => mockGetPrivyUserId(...a),
}));

vi.mock('@/lib/db/sponsored-activations', () => ({
  getSponsoredActivationByIdOrSlug: (...a: unknown[]) =>
    mockGetActivation(...a),
}));

vi.mock('@/lib/db/activation-redemptions', () => ({
  getActivationRedemptionById: (...a: unknown[]) => mockGetRedemptionById(...a),
  confirmActivationPurchaseAtomic: (...a: unknown[]) => mockConfirmRpc(...a),
}));

vi.mock('@/lib/db/activation-reward-items', () => ({
  getActivationRewardItemById: (...a: unknown[]) => mockGetRewardItem(...a),
}));

const mockTrackPurchaseConfirmed = vi.fn();
const mockTrackCapReached = vi.fn();
const mockResolveIdentity = vi.fn();

vi.mock('@/lib/analytics/server', () => ({
  resolveServerIdentity: (...a: unknown[]) => mockResolveIdentity(...a),
  trackSponsoredRedemptionPurchaseConfirmed: (...a: unknown[]) =>
    mockTrackPurchaseConfirmed(...a),
  trackSponsoredActivationCapReached: (...a: unknown[]) =>
    mockTrackCapReached(...a),
}));

vi.mock('@/lib/db/players', () => ({
  getPlayerByWallet: (...a: unknown[]) => mockGetPlayerByWallet(...a),
  createOrUpdatePlayer: (...a: unknown[]) => mockCreateOrUpdatePlayer(...a),
}));

import { POST } from '../route';

const wallet = '0x1234567890123456789012345678901234567890';
const redemptionId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

const eligibilityConfig = {
  max_events_per_user: 5,
  max_events_per_user_per_day: 2,
  required_checkpoint_ids: ['cp-1'],
};

const activeActivation = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  slug: 'slug-1',
  title: 'T',
  sponsor_name: 'S',
  event_id: null,
  status: 'active' as const,
  settlement_rail: 'base' as const,
  campaign_wallet_address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  venue_settlement_wallet_address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  usdc_asset_config: {},
  max_redemptions: 10,
  max_usdc_budget: null,
  usdc_settled_total: 0,
  redemption_count_confirmed: 0,
  starts_at: '2026-01-01T00:00:00.000Z',
  ends_at: '2027-01-01T00:00:00.000Z',
  eligibility_config: eligibilityConfig,
  created_by: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  activation_create_idempotency_key: null,
  privy_campaign_wallet_id: null,
};

const rewardItem = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  activation_id: activeActivation.id,
  name: 'Drink',
  hero_image_url: null,
  description: null,
  points_cost: 10,
  usdc_amount: 5,
  sort_order: 0,
  is_active: true,
  max_per_user: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

function redemptionRow(
  status: 'available' | 'ready_to_redeem'
): Record<string, unknown> {
  return {
    id: redemptionId,
    activation_id: activeActivation.id,
    reward_item_id: rewardItem.id,
    user_id: 1,
    eligibility_event_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    status,
    idempotency_key: `${activeActivation.id}:1:${rewardItem.id}`,
    points_spent: status === 'ready_to_redeem' ? 10 : null,
    usdc_amount_snapshot: status === 'ready_to_redeem' ? 5 : null,
    purchase_confirmed_at:
      status === 'ready_to_redeem' ? '2026-05-25T12:00:00.000Z' : null,
    redeemed_at: null,
    cancelled_reason: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

function postReq(body: unknown, activationSegment = activeActivation.id) {
  return new NextRequest(
    `http://localhost/api/sponsored-activations/${activationSegment}/confirm-purchase`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveIdentity.mockReturnValue('mixpanel-distinct');
  mockVerifyWallet.mockResolvedValue({
    authorized: true,
    userId: 'privy-user-1',
  });
  mockGetPrivyUserId.mockResolvedValue('privy-user-1');
  mockGetActivation.mockResolvedValue(activeActivation);
  mockGetPlayerByWallet.mockResolvedValue({
    id: 1,
    wallet_address: wallet,
    total_points: 100,
  });
  mockGetRewardItem.mockResolvedValue(rewardItem);
  mockConfirmRpc.mockResolvedValue({
    outcome: 'created',
    playerTotalPoints: 90,
  });
});

describe('POST /api/sponsored-activations/[activationId]/confirm-purchase', () => {
  it('returns 200 with redemption and player points on success', async () => {
    let load = 0;
    mockGetRedemptionById.mockImplementation(async () => {
      load += 1;
      if (load === 1) return redemptionRow('available');
      return redemptionRow('ready_to_redeem');
    });

    const res = await POST(postReq({ walletAddress: wallet, redemptionId }), {
      params: { activationId: activeActivation.id },
    });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.data.redemption.status).toBe('ready_to_redeem');
    expect(j.data.player.total_points).toBe(90);
    expect(mockConfirmRpc).toHaveBeenCalledWith({
      redemptionId,
      playerId: 1,
      walletAddress: expect.stringMatching(/^0x[a-fA-F0-9]{40}$/),
      maxPurchaseConfirmsPerUser: eligibilityConfig.max_events_per_user,
      maxPurchaseConfirmsPerUserPerDay:
        eligibilityConfig.max_events_per_user_per_day,
    });
    expect(mockTrackPurchaseConfirmed).toHaveBeenCalledTimes(1);
    expect(mockTrackPurchaseConfirmed).toHaveBeenCalledWith(
      'mixpanel-distinct',
      expect.objectContaining({
        activation_id: activeActivation.id,
        redemption_id: redemptionId,
        user_id: 1,
        reward_item_id: rewardItem.id,
        status: 'ready_to_redeem',
      })
    );
    expect(mockTrackPurchaseConfirmed.mock.calls[0][1]).not.toHaveProperty(
      'wallet_address'
    );
  });

  it('returns 400 when points are insufficient', async () => {
    mockGetRedemptionById.mockResolvedValue(redemptionRow('available'));
    mockConfirmRpc.mockRejectedValue(
      new Error('ACTIVATION_PURCHASE_INSUFFICIENT_POINTS')
    );

    const res = await POST(postReq({ walletAddress: wallet, redemptionId }), {
      params: { activationId: activeActivation.id },
    });
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.success).toBe(false);
    expect(j.error).toContain('enough points');
  });

  it('returns 400 when activation is not in a live user redemption window', async () => {
    mockGetActivation.mockResolvedValue({
      ...activeActivation,
      status: 'paused',
    });
    mockGetRedemptionById.mockResolvedValue(redemptionRow('available'));

    const res = await POST(postReq({ walletAddress: wallet, redemptionId }), {
      params: { activationId: activeActivation.id },
    });
    expect(res.status).toBe(400);
    expect(mockConfirmRpc).not.toHaveBeenCalled();
  });

  it('returns 400 when activation redemption cap is exceeded (RPC)', async () => {
    mockGetRedemptionById.mockResolvedValue(redemptionRow('available'));
    mockConfirmRpc.mockRejectedValue(
      new Error('ACTIVATION_PURCHASE_CAP_EXCEEDED')
    );

    const res = await POST(postReq({ walletAddress: wallet, redemptionId }), {
      params: { activationId: activeActivation.id },
    });
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toBe('This reward is no longer available');
    expect(mockTrackCapReached).toHaveBeenCalledTimes(1);
    expect(mockTrackCapReached).toHaveBeenCalledWith(
      'mixpanel-distinct',
      expect.objectContaining({
        activation_id: activeActivation.id,
        redemption_id: redemptionId,
        user_id: 1,
      })
    );
  });

  it('returns 400 when USDC budget cap would be exceeded (RPC)', async () => {
    mockGetRedemptionById.mockResolvedValue(redemptionRow('available'));
    mockConfirmRpc.mockRejectedValue(
      new Error('ACTIVATION_PURCHASE_USDC_BUDGET_EXCEEDED')
    );

    const res = await POST(postReq({ walletAddress: wallet, redemptionId }), {
      params: { activationId: activeActivation.id },
    });
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toBe('This reward is no longer available');
    expect(mockTrackCapReached).not.toHaveBeenCalled();
  });

  it('is idempotent when redemption is already ready_to_redeem', async () => {
    mockGetRedemptionById.mockResolvedValue(redemptionRow('ready_to_redeem'));
    mockConfirmRpc.mockResolvedValue({
      outcome: 'already_confirmed',
      playerTotalPoints: 90,
    });

    const res = await POST(postReq({ walletAddress: wallet, redemptionId }), {
      params: { activationId: activeActivation.id },
    });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.data.redemption.status).toBe('ready_to_redeem');
    expect(j.data.player.total_points).toBe(90);
    expect(mockGetRewardItem).not.toHaveBeenCalled();
    expect(mockTrackPurchaseConfirmed).not.toHaveBeenCalled();
  });

  it('allows idempotent confirm when activation is paused (replay)', async () => {
    mockGetActivation.mockResolvedValue({
      ...activeActivation,
      status: 'paused',
    });
    mockGetRedemptionById.mockResolvedValue(redemptionRow('ready_to_redeem'));
    mockConfirmRpc.mockResolvedValue({
      outcome: 'already_confirmed',
      playerTotalPoints: 90,
    });

    const res = await POST(postReq({ walletAddress: wallet, redemptionId }), {
      params: { activationId: activeActivation.id },
    });
    expect(res.status).toBe(200);
    expect(mockConfirmRpc).toHaveBeenCalled();
    expect(mockTrackPurchaseConfirmed).not.toHaveBeenCalled();
  });

  it('returns 400 when max_per_user is exceeded (RPC)', async () => {
    mockGetRedemptionById.mockResolvedValue(redemptionRow('available'));
    mockConfirmRpc.mockRejectedValue(
      new Error('ACTIVATION_PURCHASE_MAX_PER_USER')
    );

    const res = await POST(postReq({ walletAddress: wallet, redemptionId }), {
      params: { activationId: activeActivation.id },
    });
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toBe('This reward is no longer available');
    expect(mockTrackCapReached).not.toHaveBeenCalled();
  });

  it('returns 401 when Privy wallet auth fails', async () => {
    mockVerifyWallet.mockResolvedValue({
      authorized: false,
      error: 'Unauthorized',
    });

    const res = await POST(postReq({ walletAddress: wallet, redemptionId }), {
      params: { activationId: activeActivation.id },
    });
    expect(res.status).toBe(401);
    expect(mockGetRedemptionById).not.toHaveBeenCalled();
  });

  it('returns 401 when token userId does not match wallet ownership', async () => {
    mockVerifyWallet.mockResolvedValue({
      authorized: true,
      userId: 'privy-user-1',
    });
    mockGetPrivyUserId.mockResolvedValue('other-user');

    const res = await POST(postReq({ walletAddress: wallet, redemptionId }), {
      params: { activationId: activeActivation.id },
    });
    expect(res.status).toBe(401);
  });

  it('returns 429 when daily confirm rate limit is exceeded (RPC)', async () => {
    mockGetRedemptionById.mockResolvedValue(redemptionRow('available'));
    mockConfirmRpc.mockRejectedValue(
      new Error('ACTIVATION_PURCHASE_DAILY_USER_LIMIT_EXCEEDED')
    );

    const res = await POST(postReq({ walletAddress: wallet, redemptionId }), {
      params: { activationId: activeActivation.id },
    });
    expect(res.status).toBe(429);
    const j = await res.json();
    expect(j.error).toBe('Too many eligibility requests today');
  });

  it('rejects non-strict JSON bodies via Zod', async () => {
    const res = await POST(
      postReq({
        walletAddress: wallet,
        redemptionId,
        extra: true,
      } as Record<string, unknown>),
      { params: { activationId: activeActivation.id } }
    );
    expect(res.status).toBe(400);
  });
});

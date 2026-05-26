import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockVerifyWallet = vi.fn();
const mockGetPrivyUserId = vi.fn();
const mockGetActivation = vi.fn();
const mockGetRedemptionById = vi.fn();
const mockSwipeRpc = vi.fn();
const mockGetPlayerByWallet = vi.fn();
const mockCreateOrUpdatePlayer = vi.fn();
const mockGetSettlementByRedemptionId = vi.fn();

const mockTrackRedeemed = vi.fn();
const mockTrackQueued = vi.fn();
const mockTrackExpired = vi.fn();
const mockResolveIdentity = vi.fn();

vi.mock('@/lib/analytics/server', () => ({
  resolveServerIdentity: (...a: unknown[]) => mockResolveIdentity(...a),
  trackSponsoredRedemptionRedeemed: (...a: unknown[]) =>
    mockTrackRedeemed(...a),
  trackSponsoredSettlementQueued: (...a: unknown[]) => mockTrackQueued(...a),
  trackSponsoredRedemptionExpired: (...a: unknown[]) => mockTrackExpired(...a),
}));

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
  swipeActivationRedeemAtomic: (...a: unknown[]) => mockSwipeRpc(...a),
}));

vi.mock('@/lib/db/activation-settlement-transactions', () => ({
  getActivationSettlementTransactionByRedemptionId: (...a: unknown[]) =>
    mockGetSettlementByRedemptionId(...a),
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
  max_usdc_budget: 100,
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

const settlementRow = {
  id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  redemption_id: redemptionId,
  activation_id: activeActivation.id,
  settlement_rail: 'base' as const,
  status: 'queued' as const,
  amount: 5,
  from_wallet_address: activeActivation.campaign_wallet_address,
  to_wallet_address: activeActivation.venue_settlement_wallet_address,
  tx_hash: null,
  submission_attempt: 0,
  last_error_code: null,
  queued_at: '2026-05-25T12:00:00.000Z',
  submitted_at: null,
  confirmed_at: null,
  privy_transaction_id: null,
};

function redemptionRow(
  status: 'available' | 'ready_to_redeem' | 'settlement_pending' | 'expired'
): Record<string, unknown> {
  return {
    id: redemptionId,
    activation_id: activeActivation.id,
    reward_item_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    user_id: 1,
    eligibility_event_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    status,
    idempotency_key: `${activeActivation.id}:1:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`,
    points_spent: 10,
    usdc_amount_snapshot: 5,
    purchase_confirmed_at: '2026-05-25T12:00:00.000Z',
    redeemed_at:
      status === 'settlement_pending' || status === 'expired'
        ? '2026-05-25T12:05:00.000Z'
        : null,
    cancelled_reason: status === 'expired' ? 'activation_window_ended' : null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

function postReq(body: unknown, activationSegment = activeActivation.id) {
  return new NextRequest(
    `http://localhost/api/sponsored-activations/${activationSegment}/swipe-redeem`,
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
  mockSwipeRpc.mockResolvedValue({ outcome: 'created' });
  mockGetSettlementByRedemptionId.mockResolvedValue(settlementRow);
});

describe('POST /api/sponsored-activations/[activationId]/swipe-redeem', () => {
  it('returns 200 with redemption and settlement on success', async () => {
    let loads = 0;
    mockGetRedemptionById.mockImplementation(async () => {
      loads += 1;
      if (loads === 1) return redemptionRow('ready_to_redeem');
      return redemptionRow('settlement_pending');
    });

    const res = await POST(postReq({ walletAddress: wallet, redemptionId }), {
      params: { activationId: activeActivation.id },
    });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.data.redemption.status).toBe('settlement_pending');
    expect(j.data.settlement.status).toBe('queued');
    expect(j.data.settlement.redemption_id).toBe(redemptionId);
    expect(mockSwipeRpc).toHaveBeenCalledWith({
      redemptionId,
      playerId: 1,
      walletAddress: expect.stringMatching(/^0x[a-fA-F0-9]{40}$/),
      maxSwipeRedeemsPerUser: eligibilityConfig.max_events_per_user,
      maxSwipeRedeemsPerUserPerDay:
        eligibilityConfig.max_events_per_user_per_day,
    });
    expect(mockTrackRedeemed).toHaveBeenCalledTimes(1);
    expect(mockTrackQueued).toHaveBeenCalledTimes(1);
    expect(mockTrackQueued).toHaveBeenCalledWith(
      'mixpanel-distinct',
      expect.objectContaining({
        settlement_id: settlementRow.id,
        usdc_amount: settlementRow.amount,
        redemption_id: redemptionId,
      })
    );
  });

  it('returns 400 when redemption is not ready_to_redeem (wrong status)', async () => {
    mockGetRedemptionById.mockResolvedValue(redemptionRow('available'));
    mockSwipeRpc.mockRejectedValue(
      new Error('ACTIVATION_SWIPE_INVALID_STATUS')
    );

    const res = await POST(postReq({ walletAddress: wallet, redemptionId }), {
      params: { activationId: activeActivation.id },
    });
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.success).toBe(false);
    expect(j.error).toBe('Unable to complete this redemption');
  });

  it('is idempotent when redemption is already settlement_pending', async () => {
    mockGetRedemptionById.mockResolvedValue(
      redemptionRow('settlement_pending')
    );
    mockSwipeRpc.mockResolvedValue({ outcome: 'already_redeemed' });

    const res = await POST(postReq({ walletAddress: wallet, redemptionId }), {
      params: { activationId: activeActivation.id },
    });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.data.redemption.status).toBe('settlement_pending');
    expect(j.data.settlement.id).toBe(settlementRow.id);
    expect(mockTrackRedeemed).not.toHaveBeenCalled();
    expect(mockTrackQueued).not.toHaveBeenCalled();
  });

  it('returns idempotent 200 when activation is paused but redemption already swiped', async () => {
    mockGetActivation.mockResolvedValue({
      ...activeActivation,
      status: 'paused',
    });
    mockGetRedemptionById.mockResolvedValue(
      redemptionRow('settlement_pending')
    );
    mockSwipeRpc.mockResolvedValue({ outcome: 'already_redeemed' });

    const res = await POST(postReq({ walletAddress: wallet, redemptionId }), {
      params: { activationId: activeActivation.id },
    });
    expect(res.status).toBe(200);
    expect(mockSwipeRpc).toHaveBeenCalled();
  });

  it('returns 400 when USDC budget is exceeded (RPC)', async () => {
    mockGetRedemptionById.mockResolvedValue(redemptionRow('ready_to_redeem'));
    mockSwipeRpc.mockRejectedValue(
      new Error('ACTIVATION_SWIPE_BUDGET_EXCEEDED')
    );

    const res = await POST(postReq({ walletAddress: wallet, redemptionId }), {
      params: { activationId: activeActivation.id },
    });
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toBe('This reward is no longer available');
  });

  it('returns 400 when max_per_user is exceeded at swipe (RPC)', async () => {
    mockGetRedemptionById.mockResolvedValue(redemptionRow('ready_to_redeem'));
    mockSwipeRpc.mockRejectedValue(new Error('ACTIVATION_SWIPE_MAX_PER_USER'));

    const res = await POST(postReq({ walletAddress: wallet, redemptionId }), {
      params: { activationId: activeActivation.id },
    });
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toBe('This reward is no longer available');
  });

  it('returns 400 with terminal redemption when swipe is after activation window (expired)', async () => {
    let loads = 0;
    mockGetRedemptionById.mockImplementation(async (id: string) => {
      expect(id).toBe(redemptionId);
      loads += 1;
      if (loads === 1) return redemptionRow('ready_to_redeem');
      return redemptionRow('expired');
    });
    mockSwipeRpc.mockResolvedValue({ outcome: 'expired' });

    const res = await POST(postReq({ walletAddress: wallet, redemptionId }), {
      params: { activationId: activeActivation.id },
    });
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toBe('This redemption is no longer valid');
    expect(j.details?.redemption?.status).toBe('expired');
    expect(mockTrackExpired).toHaveBeenCalledTimes(1);
    expect(mockTrackRedeemed).not.toHaveBeenCalled();
    expect(mockTrackQueued).not.toHaveBeenCalled();
  });

  it('returns 400 when activation is paused on a new swipe (not idempotent)', async () => {
    mockGetActivation.mockResolvedValue({
      ...activeActivation,
      status: 'paused',
    });
    mockGetRedemptionById.mockResolvedValue(redemptionRow('ready_to_redeem'));
    mockSwipeRpc.mockRejectedValue(new Error('ACTIVATION_SWIPE_NOT_LIVE'));

    const res = await POST(postReq({ walletAddress: wallet, redemptionId }), {
      params: { activationId: activeActivation.id },
    });
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toBe('Activation is not accepting redemptions right now');
  });

  it('returns 429 when daily swipe rate limit is exceeded (RPC)', async () => {
    mockGetRedemptionById.mockResolvedValue(redemptionRow('ready_to_redeem'));
    mockSwipeRpc.mockRejectedValue(
      new Error('ACTIVATION_SWIPE_DAILY_USER_LIMIT_EXCEEDED')
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
});

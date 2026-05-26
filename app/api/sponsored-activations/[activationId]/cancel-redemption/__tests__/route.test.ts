import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockVerifyWallet = vi.fn();
const mockGetPrivyUserId = vi.fn();
const mockGetActivation = vi.fn();
const mockGetRedemptionById = vi.fn();
const mockCancelRpc = vi.fn();
const mockGetPlayerByWallet = vi.fn();

const mockTrackCancelled = vi.fn();
const mockResolveIdentity = vi.fn();

vi.mock('@/lib/analytics/server', () => ({
  resolveServerIdentity: (...a: unknown[]) => mockResolveIdentity(...a),
  trackSponsoredRedemptionCancelled: (...a: unknown[]) =>
    mockTrackCancelled(...a),
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
  cancelActivationRedemptionAtomic: (...a: unknown[]) => mockCancelRpc(...a),
}));

vi.mock('@/lib/db/players', () => ({
  getPlayerByWallet: (...a: unknown[]) => mockGetPlayerByWallet(...a),
  createOrUpdatePlayer: vi.fn(),
}));

import { POST } from '../route';

const wallet = '0x1234567890123456789012345678901234567890';
const redemptionId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

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
  eligibility_config: {
    max_events_per_user: 5,
    max_events_per_user_per_day: 2,
    required_checkpoint_ids: ['cp-1'],
  },
  created_by: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  activation_create_idempotency_key: null,
  privy_campaign_wallet_id: null,
};

function redemptionRow(
  status: 'ready_to_redeem' | 'cancelled' | 'available'
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
    redeemed_at: null,
    cancelled_reason: status === 'cancelled' ? 'user_cancelled' : null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

function postReq(body: unknown, activationSegment = activeActivation.id) {
  return new NextRequest(
    `http://localhost/api/sponsored-activations/${activationSegment}/cancel-redemption`,
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
  mockCancelRpc.mockResolvedValue({ outcome: 'cancelled' });
});

describe('POST /api/sponsored-activations/[activationId]/cancel-redemption', () => {
  it('returns 200 with cancelled redemption', async () => {
    let loads = 0;
    mockGetRedemptionById.mockImplementation(async () => {
      loads += 1;
      if (loads === 1) return redemptionRow('ready_to_redeem');
      return redemptionRow('cancelled');
    });

    const res = await POST(
      postReq({ walletAddress: wallet, redemptionId, reason: 'changed mind' }),
      { params: { activationId: activeActivation.id } }
    );
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.data.redemption.status).toBe('cancelled');
    expect(mockCancelRpc).toHaveBeenCalledWith({
      redemptionId,
      playerId: 1,
      walletAddress: expect.stringMatching(/^0x[a-fA-F0-9]{40}$/),
      reason: 'changed mind',
    });
    expect(mockTrackCancelled).toHaveBeenCalledTimes(1);
  });

  it('is idempotent when redemption is already cancelled', async () => {
    mockGetRedemptionById.mockResolvedValue(redemptionRow('cancelled'));
    mockCancelRpc.mockResolvedValue({ outcome: 'already_cancelled' });

    const res = await POST(postReq({ walletAddress: wallet, redemptionId }), {
      params: { activationId: activeActivation.id },
    });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.data.redemption.status).toBe('cancelled');
    expect(mockTrackCancelled).not.toHaveBeenCalled();
  });

  it('returns 400 when redemption is not ready_to_redeem', async () => {
    mockGetRedemptionById.mockResolvedValue(redemptionRow('available'));
    mockCancelRpc.mockRejectedValue(
      new Error('ACTIVATION_CANCEL_INVALID_STATUS')
    );

    const res = await POST(postReq({ walletAddress: wallet, redemptionId }), {
      params: { activationId: activeActivation.id },
    });
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toBe('Unable to cancel this redemption');
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

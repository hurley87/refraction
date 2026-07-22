import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockVerifyWallet = vi.fn();
const mockGetPrivyUserId = vi.fn();
const mockGetPrivyUser = vi.fn();
const mockGetActivation = vi.fn();
const mockFindEvent = vi.fn();
const mockCountLifetime = vi.fn();
const mockCountDaily = vi.fn();
const mockInsertEvent = vi.fn();
const mockListEvents = vi.fn();
const mockListRewardItems = vi.fn();
const mockListUserRedemptions = vi.fn();
const mockListEventRedemptions = vi.fn();
const mockInsertRedemption = vi.fn();
const mockGetTiers = vi.fn();
const mockGetPlayerByWallet = vi.fn();
const mockCreateOrUpdatePlayer = vi.fn();

const mockTrackEligibilityRecorded = vi.fn();
const mockResolveIdentity = vi.fn();

vi.mock('@/lib/analytics/server', () => ({
  resolveServerIdentity: (...a: unknown[]) => mockResolveIdentity(...a),
  trackSponsoredActivationEligibilityRecorded: (...a: unknown[]) =>
    mockTrackEligibilityRecorded(...a),
}));

vi.mock('@/lib/api/privy', () => ({
  verifyWalletOwnership: (...a: unknown[]) => mockVerifyWallet(...a),
  getPrivyUserIdFromRequest: (...a: unknown[]) => mockGetPrivyUserId(...a),
  getPrivyUserFromRequest: (...a: unknown[]) => mockGetPrivyUser(...a),
}));

vi.mock('@/lib/db/sponsored-activations', () => ({
  getSponsoredActivationByIdOrSlug: (...a: unknown[]) =>
    mockGetActivation(...a),
}));

vi.mock('@/lib/db/activation-eligibility-events', () => ({
  findEligibilityEventByLogicalKey: (...a: unknown[]) => mockFindEvent(...a),
  countEligibilityEventsForUserActivation: (...a: unknown[]) =>
    mockCountLifetime(...a),
  countEligibilityEventsForUserActivationInUtcWindow: (...a: unknown[]) =>
    mockCountDaily(...a),
  insertActivationEligibilityEvent: (...a: unknown[]) => mockInsertEvent(...a),
  listEligibilityEventsForUserActivation: (...a: unknown[]) =>
    mockListEvents(...a),
}));

vi.mock('@/lib/db/activation-redemptions', () => ({
  insertActivationRedemption: (...a: unknown[]) => mockInsertRedemption(...a),
  listRedemptionsForEligibilityEvent: (...a: unknown[]) =>
    mockListEventRedemptions(...a),
  listRedemptionsForUserActivation: (...a: unknown[]) =>
    mockListUserRedemptions(...a),
}));

vi.mock('@/lib/db/activation-reward-items', () => ({
  listActivationRewardItems: (...a: unknown[]) => mockListRewardItems(...a),
}));

vi.mock('@/lib/db/tiers', () => ({
  getTiers: (...a: unknown[]) => mockGetTiers(...a),
}));

vi.mock('@/lib/db/players', () => ({
  getPlayerByWallet: (...a: unknown[]) => mockGetPlayerByWallet(...a),
  createOrUpdatePlayer: (...a: unknown[]) => mockCreateOrUpdatePlayer(...a),
}));

import { POST, GET } from '../route';

const wallet = '0x1234567890123456789012345678901234567890';

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
  points_cost: 0,
  usdc_amount: 5,
  sort_order: 0,
  is_active: true,
  max_per_user: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

function postReq(body: unknown, activationSegment = activeActivation.id) {
  return new NextRequest(
    `http://localhost/api/sponsored-activations/${activationSegment}/eligibility`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
}

function getReq(activationSegment = activeActivation.id) {
  const u = new URL(
    `http://localhost/api/sponsored-activations/${activationSegment}/eligibility`
  );
  u.searchParams.set('walletAddress', wallet);
  return new NextRequest(u, { method: 'GET' });
}

describe('POST /api/sponsored-activations/[activationId]/eligibility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
    vi.clearAllMocks();
    mockResolveIdentity.mockReturnValue('mixpanel-distinct');
    mockVerifyWallet.mockResolvedValue({
      authorized: true,
      userId: 'privy-user-1',
    });
    mockGetPrivyUserId.mockResolvedValue('privy-user-1');
    mockGetPrivyUser.mockResolvedValue(null);
    mockGetActivation.mockResolvedValue(activeActivation);
    mockFindEvent.mockResolvedValue(null);
    mockCountLifetime.mockResolvedValue(0);
    mockCountDaily.mockResolvedValue(0);
    mockGetTiers.mockResolvedValue([
      {
        id: 't1',
        title: 'Bronze',
        min_points: 0,
        max_points: null,
        description: '',
        created_at: '',
        updated_at: '',
      },
    ]);
    mockGetPlayerByWallet.mockResolvedValue({
      id: 99,
      wallet_address: wallet,
      total_points: 500,
    });
    mockListRewardItems.mockResolvedValue([rewardItem]);
    mockListUserRedemptions.mockResolvedValue([]);
    mockInsertEvent.mockResolvedValue({
      id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      activation_id: activeActivation.id,
      user_id: 99,
      wallet_address: wallet,
      source: 'checkpoint_checkin',
      source_ref_id: 'cp-1',
      occurred_at: '2026-06-15T12:00:00.000Z',
      metadata: {},
    });
    mockInsertRedemption.mockResolvedValue({
      id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      activation_id: activeActivation.id,
      reward_item_id: rewardItem.id,
      user_id: 99,
      eligibility_event_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      status: 'available',
      idempotency_key: `${activeActivation.id}:99:${rewardItem.id}`,
      created_at: '2026-06-15T12:00:00.000Z',
      updated_at: '2026-06-15T12:00:00.000Z',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 401 when wallet auth fails', async () => {
    mockVerifyWallet.mockResolvedValue({
      authorized: false,
      error: 'Missing authorization token',
    });
    const res = await POST(
      postReq({
        walletAddress: wallet,
        source: 'qr_scan',
        source_ref_id: 'qr-1',
      }),
      { params: { activationId: activeActivation.id } }
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 when Privy token userId does not match verifyWalletOwnership', async () => {
    mockGetPrivyUserId.mockResolvedValue('other');
    const res = await POST(
      postReq({
        walletAddress: wallet,
        source: 'qr_scan',
        source_ref_id: 'qr-1',
      }),
      { params: { activationId: activeActivation.id } }
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for disallowed eligibility sources (not in v1 schema)', async () => {
    const res = await POST(
      postReq({
        walletAddress: wallet,
        source: 'location_checkin',
        source_ref_id: 'x',
      }),
      { params: { activationId: activeActivation.id } }
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when activation is missing', async () => {
    mockGetActivation.mockResolvedValue(null);
    const res = await POST(
      postReq({
        walletAddress: wallet,
        source: 'qr_scan',
        source_ref_id: 'qr-1',
      }),
      { params: { activationId: 'missing-slug' } }
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 when activation is not live', async () => {
    mockGetActivation.mockResolvedValue({
      ...activeActivation,
      status: 'draft',
    });
    const res = await POST(
      postReq({
        walletAddress: wallet,
        source: 'qr_scan',
        source_ref_id: 'qr-1',
      }),
      { params: { activationId: activeActivation.id } }
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when checkpoint ref is not allowed', async () => {
    const res = await POST(
      postReq({
        walletAddress: wallet,
        source: 'checkpoint_checkin',
        source_ref_id: 'wrong-cp',
      }),
      { params: { activationId: activeActivation.id } }
    );
    expect(res.status).toBe(400);
    expect(mockInsertEvent).not.toHaveBeenCalled();
  });

  it('records eligibility and creates available redemptions when rules pass', async () => {
    const res = await POST(
      postReq({
        walletAddress: wallet,
        source: 'qr_scan',
        source_ref_id: 'qr-1',
      }),
      { params: { activationId: activeActivation.id } }
    );
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.data.eligible).toBe(true);
    expect(mockInsertEvent).toHaveBeenCalled();
    expect(mockInsertRedemption).toHaveBeenCalled();
    expect(mockTrackEligibilityRecorded).toHaveBeenCalledTimes(1);
    expect(mockTrackEligibilityRecorded).toHaveBeenCalledWith(
      'mixpanel-distinct',
      expect.objectContaining({
        activation_id: activeActivation.id,
        user_id: 99,
      })
    );
  });

  it('returns 429 when daily cap is already reached', async () => {
    mockCountDaily.mockResolvedValue(2);
    const res = await POST(
      postReq({
        walletAddress: wallet,
        source: 'qr_scan',
        source_ref_id: 'qr-1',
      }),
      { params: { activationId: activeActivation.id } }
    );
    expect(res.status).toBe(429);
    expect(mockInsertEvent).not.toHaveBeenCalled();
  });

  it('returns 400 when lifetime eligibility cap is reached', async () => {
    mockCountLifetime.mockResolvedValue(5);
    const res = await POST(
      postReq({
        walletAddress: wallet,
        source: 'qr_scan',
        source_ref_id: 'qr-new',
      }),
      { params: { activationId: activeActivation.id } }
    );
    expect(res.status).toBe(400);
    expect(mockInsertEvent).not.toHaveBeenCalled();
  });

  it('returns existing event and redemptions idempotently', async () => {
    const existing = {
      id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      activation_id: activeActivation.id,
      user_id: 99,
      wallet_address: wallet,
      source: 'checkpoint_checkin' as const,
      source_ref_id: 'cp-1',
      occurred_at: '2026-06-01T00:00:00.000Z',
      metadata: {},
    };
    mockFindEvent.mockResolvedValue(existing);
    mockListEventRedemptions.mockResolvedValue([
      {
        id: 'r1',
        activation_id: activeActivation.id,
        reward_item_id: rewardItem.id,
        user_id: 99,
        eligibility_event_id: existing.id,
        status: 'available' as const,
        idempotency_key: 'k',
        created_at: '',
        updated_at: '',
      },
    ]);
    const res = await POST(
      postReq({
        walletAddress: wallet,
        source: 'checkpoint_checkin',
        source_ref_id: 'cp-1',
      }),
      { params: { activationId: activeActivation.id } }
    );
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.data.eligibilityEvent.id).toBe(existing.id);
    expect(j.data.eligible).toBe(true);
    expect(mockInsertEvent).not.toHaveBeenCalled();
    expect(mockTrackEligibilityRecorded).not.toHaveBeenCalled();
  });

  it('resolves activation by slug when path is not a UUID', async () => {
    mockGetActivation.mockImplementation((key: string) =>
      key === 'my-slug' ? activeActivation : null
    );
    const res = await POST(
      postReq(
        {
          walletAddress: wallet,
          source: 'qr_scan',
          source_ref_id: 'qr-1',
        },
        'my-slug'
      ),
      { params: { activationId: 'my-slug' } }
    );
    expect(res.status).toBe(200);
    expect(mockGetActivation).toHaveBeenCalledWith('my-slug');
  });
});

describe('GET /api/sponsored-activations/[activationId]/eligibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyWallet.mockResolvedValue({
      authorized: true,
      userId: 'privy-user-1',
    });
    mockGetPrivyUserId.mockResolvedValue('privy-user-1');
    mockGetActivation.mockResolvedValue(activeActivation);
    mockGetPlayerByWallet.mockResolvedValue({
      id: 99,
      wallet_address: wallet,
      total_points: 0,
    });
    mockListEvents.mockResolvedValue([]);
    mockListUserRedemptions.mockResolvedValue([]);
  });

  it('returns 401 when unauthorized', async () => {
    mockVerifyWallet.mockResolvedValue({ authorized: false });
    const res = await GET(getReq(), {
      params: { activationId: activeActivation.id },
    });
    expect(res.status).toBe(401);
  });
});

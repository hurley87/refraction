import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetActivation = vi.fn();
const mockListItems = vi.fn();

vi.mock('@/lib/db/sponsored-activations', () => ({
  getSponsoredActivationByIdOrSlug: (...a: unknown[]) =>
    mockGetActivation(...a),
}));

vi.mock('@/lib/db/activation-reward-items', () => ({
  listActivationRewardItems: (...a: unknown[]) => mockListItems(...a),
}));

import { GET } from '../route';

const activation = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  slug: 'pr-drink',
  title: 'Public Records Drink',
  description: 'A complimentary drink at Public Records.',
  sponsor_name: 'Public Records',
  event_id: null,
  status: 'active' as const,
  settlement_rail: 'base' as const,
  campaign_wallet_address: '0x1111111111111111111111111111111111111111',
  venue_settlement_wallet_address: '0x2222222222222222222222222222222222222222',
  usdc_asset_config: {},
  max_redemptions: 10,
  max_usdc_budget: null,
  usdc_settled_total: 0,
  redemption_count_confirmed: 0,
  starts_at: '2026-01-01T00:00:00.000Z',
  ends_at: '2027-01-01T00:00:00.000Z',
  eligibility_config: {},
  created_by: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  activation_create_idempotency_key: null,
  privy_campaign_wallet_id: null,
};

const activeItem = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  activation_id: activation.id,
  name: 'House drink',
  hero_image_url:
    'https://example.supabase.co/storage/v1/object/public/x/y.webp',
  description: 'One drink',
  points_cost: 500,
  usdc_amount: 7,
  sort_order: 0,
  is_active: true,
  max_per_user: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/sponsored-activations/[activationId]', () => {
  it('returns sanitized activation + first active reward item', async () => {
    mockGetActivation.mockResolvedValue(activation);
    mockListItems.mockResolvedValue([activeItem]);

    const res = await GET(
      new NextRequest('http://localhost/api/sponsored-activations/pr-drink'),
      { params: { activationId: 'pr-drink' } }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.activation).toEqual({
      id: activation.id,
      title: activation.title,
      description: activation.description,
      sponsor_name: activation.sponsor_name,
      slug: activation.slug,
      status: activation.status,
      settlement_rail: activation.settlement_rail,
      window: {
        starts_at: activation.starts_at,
        ends_at: activation.ends_at,
      },
    });
    expect(json.data.rewardItem).toEqual({
      id: activeItem.id,
      name: activeItem.name,
      hero_image_url: activeItem.hero_image_url,
      description: activeItem.description,
      points_cost: activeItem.points_cost,
      perk_value_usd: 7,
      perk_value_label: '$7 USD value',
    });
    expect(json.data.rewardItem).not.toHaveProperty('usdc_amount');
  });

  it('returns 404 when activation is missing', async () => {
    mockGetActivation.mockResolvedValue(null);
    const res = await GET(
      new NextRequest('http://localhost/api/sponsored-activations/missing'),
      { params: { activationId: 'missing' } }
    );
    expect(res.status).toBe(404);
  });

  it('returns 404 when no active reward item', async () => {
    mockGetActivation.mockResolvedValue(activation);
    mockListItems.mockResolvedValue([{ ...activeItem, is_active: false }]);
    const res = await GET(
      new NextRequest('http://localhost/api/sponsored-activations/pr-drink'),
      { params: { activationId: 'pr-drink' } }
    );
    expect(res.status).toBe(404);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireAdmin = vi.fn();
const mockList = vi.fn();
const mockGetById = vi.fn();
const mockGetByIdempotency = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockCountRedemptions = vi.fn();
const mockCountActiveItems = vi.fn();
const mockCreatePrivy = vi.fn();
const mockListItems = vi.fn();
const mockGetItem = vi.fn();
const mockCreateItem = vi.fn();
const mockUpdateItem = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

vi.mock('@/lib/db/sponsored-activations', () => ({
  listSponsoredActivations: () => mockList(),
  getSponsoredActivationById: (id: string) => mockGetById(id),
  getSponsoredActivationByCreateIdempotencyKey: (k: string) =>
    mockGetByIdempotency(k),
  createSponsoredActivation: (input: unknown) => mockCreate(input),
  updateSponsoredActivation: (id: string, patch: unknown) =>
    mockUpdate(id, patch),
  countActivationRedemptions: (id: string) => mockCountRedemptions(id),
  countActiveRewardItemsForActivation: (id: string) => mockCountActiveItems(id),
}));

vi.mock('@/lib/api/privy', () => ({
  createSponsoredActivationPrivyCampaignWallet: (...args: unknown[]) =>
    mockCreatePrivy(...args),
}));

vi.mock('@/lib/db/activation-reward-items', () => ({
  listActivationRewardItems: (activationId: string) =>
    mockListItems(activationId),
  createActivationRewardItem: (input: unknown) => mockCreateItem(input),
  getActivationRewardItemById: (activationId: string, itemId: string) =>
    mockGetItem(activationId, itemId),
  updateActivationRewardItem: (
    activationId: string,
    itemId: string,
    patch: unknown
  ) => mockUpdateItem(activationId, itemId, patch),
}));

vi.mock('@/lib/activation/explorer-url', () => ({
  sponsoredActivationAdminEnvelope: (row: Record<string, unknown>) => ({
    ...row,
    campaign_wallet_explorer_url: 'https://ex/c',
    venue_settlement_wallet_explorer_url: 'https://ex/v',
    settlement_explorer_tx_url_template: 'https://ex/tx/{txHash}',
  }),
}));

import { POSTER_CHECKOUT_USDC_ADDRESS_BASE } from '@/lib/walletconnect-poster-direct-usdc';
import { DEFAULT_SPONSORED_ACTIVATION_ELIGIBILITY_CONFIG } from '@/lib/schemas/activation-eligibility-config';
import { GET as listGET, POST as listPOST } from '../route';
import { GET as oneGET, PATCH as onePATCH } from '../[activationId]/route';
import {
  GET as itemsGET,
  POST as itemsPOST,
} from '../[activationId]/reward-items/route';
import {
  GET as itemGET,
  PATCH as itemPATCH,
} from '../[activationId]/reward-items/[itemId]/route';

const SAMPLE_CONTRACT = '0x2222222222222222222222222222222222222222';
const STELLAR = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
const validWindow = {
  starts_at: '2026-06-01T12:00:00.000Z',
  ends_at: '2026-06-30T12:00:00.000Z',
};

const baseFixture = {
  id: 'act-1',
  slug: 's1',
  title: 'T',
  sponsor_name: 'S',
  event_id: null,
  status: 'draft' as const,
  settlement_rail: 'base' as const,
  campaign_wallet_address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  venue_settlement_wallet_address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  usdc_asset_config: { contract_address: SAMPLE_CONTRACT },
  max_redemptions: 10,
  max_usdc_budget: null,
  usdc_settled_total: 0,
  redemption_count_confirmed: 0,
  ...validWindow,
  eligibility_config: DEFAULT_SPONSORED_ACTIVATION_ELIGIBILITY_CONFIG,
  created_by: 'a@b.com',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  activation_create_idempotency_key: 'k1',
  privy_campaign_wallet_id: 'pw1',
};

function jsonReq(
  method: 'GET' | 'POST' | 'PATCH',
  url: string,
  body?: Record<string, unknown>,
  idem?: string
): NextRequest {
  const h = new Headers();
  h.set('x-user-email', 'admin@example.com');
  if (body) h.set('Content-Type', 'application/json');
  if (idem) h.set('idempotency-key', idem);
  return new NextRequest(url, {
    method,
    headers: h,
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue({
    isValid: true,
    user: { email: 'admin@example.com' },
  });
  mockGetByIdempotency.mockResolvedValue(null);
  mockCountRedemptions.mockResolvedValue(0);
  mockCountActiveItems.mockResolvedValue(1);
  mockCreatePrivy.mockResolvedValue({
    privy_campaign_wallet_id: 'pw-new',
    campaign_wallet_address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    campaign_wallet_chain: 'base-mainnet',
    campaign_wallet_created_at: '2026-04-28T00:00:00.000Z',
  });
});

describe('GET /api/admin/sponsored-activations', () => {
  it('returns 403 when not admin', async () => {
    mockRequireAdmin.mockResolvedValue({ isValid: false });
    const res = await listGET(
      jsonReq('GET', 'http://localhost/api/admin/sponsored-activations')
    );
    expect(res.status).toBe(403);
    expect(mockList).not.toHaveBeenCalled();
  });

  it('returns activations for admin', async () => {
    mockList.mockResolvedValue([baseFixture]);
    const res = await listGET(
      jsonReq('GET', 'http://localhost/api/admin/sponsored-activations')
    );
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.data.activations).toHaveLength(1);
  });
});

describe('POST /api/admin/sponsored-activations', () => {
  it('returns 403 when not admin', async () => {
    mockRequireAdmin.mockResolvedValue({ isValid: false });
    const res = await listPOST(
      jsonReq('POST', 'http://localhost/api/admin/sponsored-activations', {
        settlement_rail: 'base',
        title: 't',
        sponsor_name: 's',
        max_redemptions: 1,
        ...validWindow,
        venue_settlement_wallet_address:
          '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      })
    );
    expect(res.status).toBe(403);
  });

  it('returns 400 on cross-rail venue address', async () => {
    const res = await listPOST(
      jsonReq('POST', 'http://localhost/api/admin/sponsored-activations', {
        settlement_rail: 'base',
        title: 't',
        sponsor_name: 's',
        max_redemptions: 1,
        ...validWindow,
        venue_settlement_wallet_address: STELLAR,
      })
    );
    expect(res.status).toBe(400);
    expect(mockCreatePrivy).not.toHaveBeenCalled();
  });

  it('provisions Privy wallet and persists activation', async () => {
    mockCreate.mockResolvedValue(baseFixture);
    const res = await listPOST(
      jsonReq(
        'POST',
        'http://localhost/api/admin/sponsored-activations',
        {
          settlement_rail: 'base',
          title: 't',
          sponsor_name: 's',
          max_redemptions: 1,
          ...validWindow,
          venue_settlement_wallet_address:
            '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        },
        'idem-xyz'
      )
    );
    expect(res.status).toBe(200);
    expect(mockCreatePrivy).toHaveBeenCalledWith({
      idempotencyKey: 'idem-xyz',
      settlementRail: 'base',
    });
    expect(mockCreate).toHaveBeenCalled();
    const createArg = mockCreate.mock.calls[0][0] as {
      status: string;
      id: string;
      slug: string;
      usdc_asset_config: { contract_address: string };
      eligibility_config: typeof DEFAULT_SPONSORED_ACTIVATION_ELIGIBILITY_CONFIG;
    };
    expect(createArg.status).toBe('draft');
    expect(createArg.id).toBe(createArg.slug);
    expect(createArg.usdc_asset_config.contract_address).toBe(
      POSTER_CHECKOUT_USDC_ADDRESS_BASE
    );
    expect(createArg.eligibility_config).toEqual(
      DEFAULT_SPONSORED_ACTIVATION_ELIGIBILITY_CONFIG
    );
  });
});

describe('PATCH /api/admin/sponsored-activations/[activationId]', () => {
  it('returns 403 when not admin', async () => {
    mockRequireAdmin.mockResolvedValue({ isValid: false });
    const res = await onePATCH(
      jsonReq('PATCH', 'http://localhost/api/admin/sponsored-activations/a', {
        title: 'x',
      }),
      { params: { activationId: 'a' } }
    );
    expect(res.status).toBe(403);
  });

  it('blocks immutable wallet fields when status is active', async () => {
    mockGetById.mockResolvedValue({
      ...baseFixture,
      status: 'active',
    });
    const res = await onePATCH(
      jsonReq(
        'PATCH',
        'http://localhost/api/admin/sponsored-activations/act-1',
        {
          settlement_rail: 'base',
          venue_settlement_wallet_address:
            '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        }
      ),
      { params: { activationId: 'act-1' } }
    );
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('blocks wallet edits when draft but redemptions exist', async () => {
    mockGetById.mockResolvedValue({ ...baseFixture, status: 'draft' });
    mockCountRedemptions.mockResolvedValue(1);
    const res = await onePATCH(
      jsonReq(
        'PATCH',
        'http://localhost/api/admin/sponsored-activations/act-1',
        {
          settlement_rail: 'base',
          usdc_asset_config: { contract_address: SAMPLE_CONTRACT },
        }
      ),
      { params: { activationId: 'act-1' } }
    );
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('allows activating when reward items exist', async () => {
    mockGetById.mockResolvedValue({ ...baseFixture, status: 'draft' });
    mockCountActiveItems.mockResolvedValue(1);
    mockUpdate.mockResolvedValue({ ...baseFixture, status: 'active' });
    const res = await onePATCH(
      jsonReq(
        'PATCH',
        'http://localhost/api/admin/sponsored-activations/act-1',
        {
          status: 'active',
        }
      ),
      { params: { activationId: 'act-1' } }
    );
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('rejects active without active reward items', async () => {
    mockGetById.mockResolvedValue({ ...baseFixture, status: 'draft' });
    mockCountActiveItems.mockResolvedValue(0);
    const res = await onePATCH(
      jsonReq(
        'PATCH',
        'http://localhost/api/admin/sponsored-activations/act-1',
        {
          status: 'active',
        }
      ),
      { params: { activationId: 'act-1' } }
    );
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe('GET /api/admin/sponsored-activations/[activationId]', () => {
  it('returns 404 when missing', async () => {
    mockGetById.mockResolvedValue(null);
    const res = await oneGET(
      jsonReq(
        'GET',
        'http://localhost/api/admin/sponsored-activations/missing'
      ),
      { params: { activationId: 'missing' } }
    );
    expect(res.status).toBe(404);
  });
});

describe('reward item routes', () => {
  it('lists reward items', async () => {
    mockGetById.mockResolvedValue(baseFixture);
    mockListItems.mockResolvedValue([]);
    const res = await itemsGET(
      jsonReq(
        'GET',
        'http://localhost/api/admin/sponsored-activations/act-1/reward-items'
      ),
      { params: { activationId: 'act-1' } }
    );
    expect(res.status).toBe(200);
  });

  it('creates reward item', async () => {
    mockGetById.mockResolvedValue(baseFixture);
    mockCreateItem.mockResolvedValue({
      id: 'ri-1',
      activation_id: 'act-1',
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
    });
    const res = await itemsPOST(
      jsonReq(
        'POST',
        'http://localhost/api/admin/sponsored-activations/act-1/reward-items',
        {
          name: 'Drink',
          usdc_amount: 5,
        }
      ),
      { params: { activationId: 'act-1' } }
    );
    expect(res.status).toBe(200);
  });

  it('gets and patches a reward item', async () => {
    mockGetById.mockResolvedValue(baseFixture);
    const item = {
      id: 'ri-1',
      activation_id: 'act-1',
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
    mockGetItem.mockResolvedValue(item);
    const g = await itemGET(
      jsonReq(
        'GET',
        'http://localhost/api/admin/sponsored-activations/act-1/reward-items/ri-1'
      ),
      { params: { activationId: 'act-1', itemId: 'ri-1' } }
    );
    expect(g.status).toBe(200);

    mockUpdateItem.mockResolvedValue({ ...item, is_active: false });
    const p = await itemPATCH(
      jsonReq(
        'PATCH',
        'http://localhost/api/admin/sponsored-activations/act-1/reward-items/ri-1',
        { is_active: false }
      ),
      { params: { activationId: 'act-1', itemId: 'ri-1' } }
    );
    expect(p.status).toBe(200);
  });
});

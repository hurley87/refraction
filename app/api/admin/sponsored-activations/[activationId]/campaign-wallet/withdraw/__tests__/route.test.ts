import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireAdmin = vi.fn();
const mockGetSponsoredActivationById = vi.fn();
const mockWithdraw = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

vi.mock('@/lib/db/sponsored-activations', () => ({
  getSponsoredActivationById: (...args: unknown[]) =>
    mockGetSponsoredActivationById(...args),
}));

vi.mock('@/lib/activation/campaign-wallet-withdraw', () => ({
  withdrawSponsoredActivationCampaignWallet: (...args: unknown[]) =>
    mockWithdraw(...args),
}));

import { POST } from '../route';

const activation = {
  id: 'act-1',
  slug: 'act-1',
  title: 'Pilot',
  description: null,
  sponsor_name: 'Sponsor',
  event_id: null,
  status: 'active' as const,
  settlement_rail: 'base' as const,
  campaign_wallet_address: '0x1111111111111111111111111111111111111111',
  venue_settlement_wallet_address: '0x2222222222222222222222222222222222222222',
  usdc_asset_config: {
    contract_address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  max_redemptions: 10,
  max_usdc_budget: 100,
  usdc_settled_total: 5,
  redemption_count_confirmed: 2,
  starts_at: '2026-01-01T00:00:00.000Z',
  ends_at: '2026-02-01T00:00:00.000Z',
  eligibility_config: {},
  created_by: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  activation_create_idempotency_key: null,
  privy_campaign_wallet_id: 'pw-1',
};

describe('POST /api/admin/sponsored-activations/[activationId]/campaign-wallet/withdraw', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      isValid: true,
      user: { email: 'admin@example.com' },
    });
    mockGetSponsoredActivationById.mockResolvedValue(activation);
    mockWithdraw.mockResolvedValue({
      ok: true,
      status: 'confirmed',
      txHash: '0xabc',
      amountUsdc: 1.5,
      destinationAddress: '0x3333333333333333333333333333333333333333',
      privyTransactionId: 'ptx-1',
    });
  });

  it('returns 403 when admin auth fails', async () => {
    mockRequireAdmin.mockResolvedValue({ isValid: false });
    const req = new NextRequest(
      'http://localhost:3000/api/admin/sponsored-activations/act-1/campaign-wallet/withdraw',
      {
        method: 'POST',
        body: JSON.stringify({
          destinationAddress: '0x3333333333333333333333333333333333333333',
        }),
      }
    );
    const res = await POST(req, { params: { activationId: 'act-1' } });
    expect(res.status).toBe(403);
  });

  it('returns 404 when activation is missing', async () => {
    mockGetSponsoredActivationById.mockResolvedValue(null);
    const req = new NextRequest(
      'http://localhost:3000/api/admin/sponsored-activations/act-1/campaign-wallet/withdraw',
      {
        method: 'POST',
        body: JSON.stringify({
          destinationAddress: '0x3333333333333333333333333333333333333333',
        }),
      }
    );
    const res = await POST(req, { params: { activationId: 'act-1' } });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid body', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/admin/sponsored-activations/act-1/campaign-wallet/withdraw',
      {
        method: 'POST',
        body: JSON.stringify({ destinationAddress: '' }),
      }
    );
    const res = await POST(req, { params: { activationId: 'act-1' } });
    expect(res.status).toBe(400);
    expect(mockWithdraw).not.toHaveBeenCalled();
  });

  it('confirms withdrawal on success', async () => {
    const destination = '0x3333333333333333333333333333333333333333';
    const req = new NextRequest(
      'http://localhost:3000/api/admin/sponsored-activations/act-1/campaign-wallet/withdraw',
      {
        method: 'POST',
        body: JSON.stringify({ destinationAddress: destination }),
      }
    );
    const res = await POST(req, { params: { activationId: 'act-1' } });
    expect(res.status).toBe(200);
    expect(mockWithdraw).toHaveBeenCalledWith({
      activation,
      destinationAddress: destination,
      amountUsdc: undefined,
    });
    const json = await res.json();
    expect(json.data.status).toBe('confirmed');
    expect(json.data.txHash).toBe('0xabc');
  });

  it('returns 202 when withdrawal is submitted but pending', async () => {
    mockWithdraw.mockResolvedValue({
      ok: true,
      status: 'submitted',
      amountUsdc: 1.5,
      destinationAddress: '0x3333333333333333333333333333333333333333',
      message: 'pending',
    });
    const req = new NextRequest(
      'http://localhost:3000/api/admin/sponsored-activations/act-1/campaign-wallet/withdraw',
      {
        method: 'POST',
        body: JSON.stringify({
          destinationAddress: '0x3333333333333333333333333333333333333333',
        }),
      }
    );
    const res = await POST(req, { params: { activationId: 'act-1' } });
    expect(res.status).toBe(202);
  });

  it('returns business error from withdraw helper', async () => {
    mockWithdraw.mockResolvedValue({
      ok: false,
      error: 'No USDC available to withdraw.',
      statusCode: 400,
    });
    const req = new NextRequest(
      'http://localhost:3000/api/admin/sponsored-activations/act-1/campaign-wallet/withdraw',
      {
        method: 'POST',
        body: JSON.stringify({
          destinationAddress: '0x3333333333333333333333333333333333333333',
        }),
      }
    );
    const res = await POST(req, { params: { activationId: 'act-1' } });
    expect(res.status).toBe(400);
  });
});

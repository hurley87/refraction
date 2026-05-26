import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireAdmin = vi.fn();
const mockLoadDashboard = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

vi.mock('@/lib/db/sponsored-activation-admin', () => ({
  loadSponsoredActivationAdminDashboard: (...a: unknown[]) =>
    mockLoadDashboard(...a),
}));

vi.mock('@/lib/activation/explorer-url', () => ({
  sponsoredActivationAdminEnvelope: (row: Record<string, unknown>) => ({
    ...row,
    campaign_wallet_explorer_url: 'https://ex/c',
    venue_settlement_wallet_explorer_url: 'https://ex/v',
    settlement_explorer_tx_url_template: 'https://ex/tx/{txHash}',
  }),
}));

import { GET } from '../route';

const activationRow = {
  id: 'act-1',
  slug: 's1',
  title: 'T',
  sponsor_name: 'S',
  event_id: null,
  status: 'active' as const,
  settlement_rail: 'base' as const,
  campaign_wallet_address: '0x1',
  venue_settlement_wallet_address: '0x2',
  usdc_asset_config: {},
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
  privy_campaign_wallet_id: null,
};

describe('GET /api/admin/sponsored-activations/[activationId]/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ isValid: true });
    mockLoadDashboard.mockResolvedValue({
      activation: activationRow,
      tiles: {
        checkInsVerified: 3,
        redemptionsCreated: 4,
        redemptionsConfirmed: 2,
        usdcSettledTotal: 5,
        reservedUsdc: 1,
        budgetRemainingUsdc: 94,
        redemptionsRemaining: 8,
        settlementRail: 'base',
      },
      confirmedSettlements: [],
      pendingSettlements: [],
      redemptions: [],
    });
  });

  it('returns 403 when not admin', async () => {
    mockRequireAdmin.mockResolvedValue({ isValid: false });
    const res = await GET(new NextRequest('http://localhost'), {
      params: { activationId: 'act-1' },
    });
    expect(res.status).toBe(403);
    expect(mockLoadDashboard).not.toHaveBeenCalled();
  });

  it('returns 404 when activation is missing', async () => {
    mockLoadDashboard.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost'), {
      params: { activationId: 'missing' },
    });
    expect(res.status).toBe(404);
  });

  it('returns aggregated dashboard payload when admin', async () => {
    const res = await GET(new NextRequest('http://localhost'), {
      params: { activationId: 'act-1' },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    const data = body.data ?? body;
    expect(data.tiles.checkInsVerified).toBe(3);
    expect(data.tiles.redemptionsCreated).toBe(4);
    expect(data.tiles.redemptionsConfirmed).toBe(2);
    expect(data.tiles.usdcSettledTotal).toBe(5);
    expect(data.tiles.reservedUsdc).toBe(1);
    expect(data.tiles.budgetRemainingUsdc).toBe(94);
    expect(data.tiles.redemptionsRemaining).toBe(8);
    expect(data.activation.id).toBe('act-1');
    expect(data.activation.settlement_explorer_tx_url_template).toContain('tx');
  });
});

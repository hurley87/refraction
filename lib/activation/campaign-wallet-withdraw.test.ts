import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockLoadActivationReservedUsdc = vi.fn();
const mockFetchUsdcBalanceOnBase = vi.fn();
const mockSubmitTreasuryUsdcTransfer = vi.fn();
const mockWaitForTreasuryTxReceipt = vi.fn();

vi.mock('@/lib/db/sponsored-activation-admin', () => ({
  loadActivationReservedUsdc: (...a: unknown[]) =>
    mockLoadActivationReservedUsdc(...a),
}));

vi.mock('@/lib/walletconnect-poster-direct-usdc', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@/lib/walletconnect-poster-direct-usdc')
    >();
  return {
    ...actual,
    fetchUsdcBalanceOnBase: (...a: unknown[]) =>
      mockFetchUsdcBalanceOnBase(...a),
  };
});

vi.mock('@/lib/spend-treasury-usdc-transfer', () => ({
  submitTreasuryUsdcTransfer: (...a: unknown[]) =>
    mockSubmitTreasuryUsdcTransfer(...a),
  waitForTreasuryTxReceipt: (...a: unknown[]) =>
    mockWaitForTreasuryTxReceipt(...a),
}));

import {
  loadSponsoredActivationCampaignWalletBalancePack,
  withdrawSponsoredActivationCampaignWallet,
} from '@/lib/activation/campaign-wallet-withdraw';
import type { SponsoredActivationRow } from '@/lib/db/sponsored-activations';

const CADD = '0x16F93eBC5320C89EfC8701577efe49d14A276a06';

function baseActivation(
  overrides: Partial<SponsoredActivationRow> = {}
): SponsoredActivationRow {
  return {
    id: 'act-1',
    slug: 'act-1',
    title: 'T',
    description: null,
    sponsor_name: 'S',
    event_id: null,
    status: 'active',
    settlement_rail: 'base',
    campaign_wallet_address: '0x1111111111111111111111111111111111111111',
    venue_settlement_wallet_address:
      '0x2222222222222222222222222222222222222222',
    usdc_asset_config: { contract_address: CADD, symbol: 'CADD' },
    max_redemptions: null,
    max_usdc_budget: null,
    usdc_settled_total: 0,
    redemption_count_confirmed: 0,
    starts_at: '2026-01-01T00:00:00.000Z',
    ends_at: '2026-02-01T00:00:00.000Z',
    eligibility_config: {},
    created_by: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    activation_create_idempotency_key: null,
    privy_campaign_wallet_id: 'pw-1',
    ...overrides,
  };
}

describe('campaign-wallet-withdraw (CADD / 18-decimal Base tokens)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadActivationReservedUsdc.mockResolvedValue(0);
  });

  it('reads campaign wallet balance with 18 decimals for CADD', async () => {
    mockFetchUsdcBalanceOnBase.mockResolvedValue(123.456);
    const pack =
      await loadSponsoredActivationCampaignWalletBalancePack(baseActivation());
    expect(mockFetchUsdcBalanceOnBase).toHaveBeenCalledWith(
      '0x1111111111111111111111111111111111111111',
      expect.objectContaining({ usdcContract: CADD, decimals: 18 })
    );
    expect(pack.campaign_wallet_usdc_balance).toBe(123.456);
  });

  it('submits withdraw transfer with 18 decimals for CADD', async () => {
    mockFetchUsdcBalanceOnBase.mockResolvedValue(10);
    mockSubmitTreasuryUsdcTransfer.mockResolvedValue({
      ok: true,
      txHash: '0xabc',
      privyTransactionId: 'ptx-1',
    });
    mockWaitForTreasuryTxReceipt.mockResolvedValue(undefined);

    const result = await withdrawSponsoredActivationCampaignWallet({
      activation: baseActivation(),
      destinationAddress: '0x3333333333333333333333333333333333333333',
    });

    expect(mockSubmitTreasuryUsdcTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        usdcContractAddress: CADD,
        decimals: 18,
      })
    );
    expect(result.ok).toBe(true);
  });

  it('falls back to 6 decimals for legacy/unrecognized contracts', async () => {
    const legacyContract = '0x9999999999999999999999999999999999999999';
    mockFetchUsdcBalanceOnBase.mockResolvedValue(5);
    await loadSponsoredActivationCampaignWalletBalancePack(
      baseActivation({
        usdc_asset_config: { contract_address: legacyContract },
      })
    );
    expect(mockFetchUsdcBalanceOnBase).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ decimals: 6 })
    );
  });
});

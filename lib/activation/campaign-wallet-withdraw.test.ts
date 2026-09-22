import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockLoadActivationReservedUsdc = vi.fn();
const mockFetchUsdcBalanceOnBase = vi.fn();
const mockSubmitTreasuryUsdcTransfer = vi.fn();
const mockWaitForTreasuryTxReceipt = vi.fn();
const mockFetchSolanaCampaignWalletBalances = vi.fn();

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

vi.mock('@/lib/activation/solana-campaign-wallet-balance', () => ({
  fetchSolanaCampaignWalletBalances: (...a: unknown[]) =>
    mockFetchSolanaCampaignWalletBalances(...a),
  fetchSolanaSplTokenBalance: vi.fn(),
}));

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
import { CADD_ADDRESS_BASE } from '@/lib/schemas/sponsored-activation-tokens';
import { SOLANA_USDC_MINT_BY_CLUSTER } from '@/lib/activation/solana-config';

const CADD = CADD_ADDRESS_BASE;

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
        usdcAmount: 10,
      })
    );
    expect(result.ok).toBe(true);
  });

  it('withdraws full CADD balance using 18-decimal micro precision', async () => {
    const preciseBalance = 10.123456789012345678;
    mockFetchUsdcBalanceOnBase.mockResolvedValue(preciseBalance);
    mockSubmitTreasuryUsdcTransfer.mockResolvedValue({
      ok: true,
      txHash: '0xabc',
      privyTransactionId: 'ptx-1',
    });
    mockWaitForTreasuryTxReceipt.mockResolvedValue(undefined);

    await withdrawSponsoredActivationCampaignWallet({
      activation: baseActivation(),
      destinationAddress: '0x3333333333333333333333333333333333333333',
    });

    expect(mockSubmitTreasuryUsdcTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        usdcAmount: 10.123456789012345678,
        decimals: 18,
      })
    );
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

  it('omits the SOL balance for non-Solana rails', async () => {
    mockFetchUsdcBalanceOnBase.mockResolvedValue(1);
    const pack =
      await loadSponsoredActivationCampaignWalletBalancePack(baseActivation());
    expect(pack).not.toHaveProperty('campaign_wallet_sol_balance');
    expect(mockFetchSolanaCampaignWalletBalances).not.toHaveBeenCalled();
  });
});

describe('campaign-wallet-withdraw (Solana)', () => {
  const SOLANA_CAMPAIGN = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
  const solanaActivation = () =>
    baseActivation({
      settlement_rail: 'solana',
      campaign_wallet_address: SOLANA_CAMPAIGN,
      venue_settlement_wallet_address:
        '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      usdc_asset_config: {
        mint: SOLANA_USDC_MINT_BY_CLUSTER['mainnet-beta'],
        decimals: 6,
        symbol: 'USDC',
      },
      privy_campaign_wallet_id: 'pw-sol',
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadActivationReservedUsdc.mockResolvedValue(2);
  });

  it('reads USDC (configured mint) and SOL balances of the campaign wallet', async () => {
    mockFetchSolanaCampaignWalletBalances.mockResolvedValue({
      usdcBalance: 250.5,
      solBalance: 0.12,
    });

    const pack =
      await loadSponsoredActivationCampaignWalletBalancePack(
        solanaActivation()
      );

    expect(mockFetchSolanaCampaignWalletBalances).toHaveBeenCalledWith({
      ownerAddress: SOLANA_CAMPAIGN,
      mint: SOLANA_USDC_MINT_BY_CLUSTER['mainnet-beta'],
      decimals: 6,
    });
    expect(mockFetchUsdcBalanceOnBase).not.toHaveBeenCalled();
    expect(pack).toEqual({
      campaign_wallet_usdc_balance: 250.5,
      campaign_wallet_reserved_usdc: 2,
      campaign_wallet_sol_balance: 0.12,
    });
  });

  it('returns null balances when the Solana RPC fails', async () => {
    mockFetchSolanaCampaignWalletBalances.mockRejectedValue(
      new Error('rpc down')
    );
    const pack =
      await loadSponsoredActivationCampaignWalletBalancePack(
        solanaActivation()
      );
    expect(pack.campaign_wallet_usdc_balance).toBeNull();
    expect(pack.campaign_wallet_sol_balance).toBeNull();
  });

  it('does not read a USDC balance for an unconfigured mint', async () => {
    const pack = await loadSponsoredActivationCampaignWalletBalancePack(
      baseActivation({
        ...solanaActivation(),
        usdc_asset_config: {
          mint: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
          decimals: 6,
          symbol: 'USDC',
        },
      })
    );
    expect(pack.campaign_wallet_usdc_balance).toBeNull();
    expect(mockFetchSolanaCampaignWalletBalances).not.toHaveBeenCalled();
  });

  it('rejects withdrawals explicitly instead of routing to another rail', async () => {
    const result = await withdrawSponsoredActivationCampaignWallet({
      activation: solanaActivation(),
      destinationAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    });
    expect(result).toEqual({
      ok: false,
      error: 'Campaign wallet withdrawals are not yet supported on Solana.',
      statusCode: 400,
    });
    expect(mockFetchSolanaCampaignWalletBalances).not.toHaveBeenCalled();
    expect(mockSubmitTreasuryUsdcTransfer).not.toHaveBeenCalled();
  });
});

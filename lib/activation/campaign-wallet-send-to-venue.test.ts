import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockLoadActivationReservedUsdc = vi.fn();
const mockCountBroadcastingSettlements = vi.fn();
const mockFetchUsdcBalanceOnBase = vi.fn();
const mockSubmitTreasuryUsdcTransfer = vi.fn();
const mockWaitForTreasuryTxReceipt = vi.fn();
const mockFetchSolanaSplTokenBalance = vi.fn();
const mockBuildSolanaTransfer = vi.fn();
const mockSignSolanaTransfer = vi.fn();
const mockBroadcastSolana = vi.fn();
const mockCheckSolanaOutcome = vi.fn();

vi.mock('@/lib/db/sponsored-activation-admin', () => ({
  loadActivationReservedUsdc: (...a: unknown[]) =>
    mockLoadActivationReservedUsdc(...a),
  countActivationBroadcastingSettlements: (...a: unknown[]) =>
    mockCountBroadcastingSettlements(...a),
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

vi.mock('@/lib/activation/solana-token-rpc', () => ({
  fetchSolanaCampaignWalletBalances: vi.fn(),
  fetchSolanaSplTokenBalance: (...a: unknown[]) =>
    mockFetchSolanaSplTokenBalance(...a),
}));

vi.mock('@/lib/activation/solana-cadd-transfer', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@/lib/activation/solana-cadd-transfer')
    >();
  return {
    ...actual,
    createSolanaSettlementConnection: () => ({}),
    buildSolanaCaddTransferTransaction: (...a: unknown[]) =>
      mockBuildSolanaTransfer(...a),
    signSolanaCaddTransferWithPrivy: (...a: unknown[]) =>
      mockSignSolanaTransfer(...a),
    broadcastSolanaTransaction: (...a: unknown[]) => mockBroadcastSolana(...a),
    checkSolanaSignatureOutcome: (...a: unknown[]) =>
      mockCheckSolanaOutcome(...a),
  };
});

import { sendSponsoredActivationRemainingBalanceToVenue } from '@/lib/activation/campaign-wallet-send-to-venue';
import type { SponsoredActivationRow } from '@/lib/db/sponsored-activations';
import { CADD_ADDRESS_BASE } from '@/lib/schemas/sponsored-activation-tokens';

const BASE_CAMPAIGN = '0x1111111111111111111111111111111111111111';
const BASE_VENUE = '0x2222222222222222222222222222222222222222';
const SOLANA_CAMPAIGN = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
const SOLANA_VENUE = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
const SOLANA_MINT = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

function activationRow(
  overrides: Partial<SponsoredActivationRow> = {}
): SponsoredActivationRow {
  return {
    id: 'act-1',
    slug: 'act-1',
    title: 'T',
    description: null,
    sponsor_name: 'S',
    event_id: null,
    status: 'paused',
    settlement_rail: 'base',
    campaign_wallet_address: BASE_CAMPAIGN,
    venue_settlement_wallet_address: BASE_VENUE,
    usdc_asset_config: { contract_address: CADD_ADDRESS_BASE, symbol: 'CADD' },
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

function solanaActivation(overrides: Partial<SponsoredActivationRow> = {}) {
  return activationRow({
    settlement_rail: 'solana',
    campaign_wallet_address: SOLANA_CAMPAIGN,
    venue_settlement_wallet_address: SOLANA_VENUE,
    usdc_asset_config: { mint: SOLANA_MINT, decimals: 6, symbol: 'CADD' },
    privy_campaign_wallet_id: 'pw-sol',
    ...overrides,
  });
}

describe('sendSponsoredActivationRemainingBalanceToVenue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadActivationReservedUsdc.mockResolvedValue(0);
    mockCountBroadcastingSettlements.mockResolvedValue(0);
  });

  it('refuses while the activation is live', async () => {
    const result = await sendSponsoredActivationRemainingBalanceToVenue({
      activation: activationRow({ status: 'active' }),
    });
    expect(result).toEqual({
      ok: false,
      error:
        'Pause or end the activation before sending the remaining balance to the venue.',
      statusCode: 400,
    });
    expect(mockSubmitTreasuryUsdcTransfer).not.toHaveBeenCalled();
  });

  it('refuses while settlements are broadcasting', async () => {
    mockCountBroadcastingSettlements.mockResolvedValue(2);
    const result = await sendSponsoredActivationRemainingBalanceToVenue({
      activation: activationRow(),
    });
    expect(result).toMatchObject({
      ok: false,
      error:
        'Wait for 2 in-flight settlements to finish before sending the remaining balance.',
    });
    expect(mockFetchUsdcBalanceOnBase).not.toHaveBeenCalled();
    expect(mockSubmitTreasuryUsdcTransfer).not.toHaveBeenCalled();
  });

  it('sends the Base balance minus reserved funds to the venue wallet', async () => {
    mockFetchUsdcBalanceOnBase.mockResolvedValue(50);
    mockLoadActivationReservedUsdc.mockResolvedValue(15);
    mockSubmitTreasuryUsdcTransfer.mockResolvedValue({
      ok: true,
      txHash: '0xabc',
      privyTransactionId: 'ptx-1',
    });
    mockWaitForTreasuryTxReceipt.mockResolvedValue(undefined);

    const result = await sendSponsoredActivationRemainingBalanceToVenue({
      activation: activationRow(),
    });

    expect(mockSubmitTreasuryUsdcTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientAddress: BASE_VENUE,
        usdcAmount: 35,
        decimals: 18,
        referenceId: expect.stringMatching(/^sa-venue:act-1:/),
      })
    );
    expect(result).toMatchObject({
      ok: true,
      status: 'confirmed',
      txHash: '0xabc',
      amountUsdc: 35,
      destinationAddress: BASE_VENUE,
    });
  });

  it('refuses when everything left is reserved', async () => {
    mockFetchUsdcBalanceOnBase.mockResolvedValue(10);
    mockLoadActivationReservedUsdc.mockResolvedValue(10);
    const result = await sendSponsoredActivationRemainingBalanceToVenue({
      activation: activationRow(),
    });
    expect(result).toMatchObject({
      ok: false,
      error: 'No unreserved CADD left to send to the venue.',
    });
    expect(mockSubmitTreasuryUsdcTransfer).not.toHaveBeenCalled();
  });

  it('refuses when the venue wallet is the campaign wallet', async () => {
    const result = await sendSponsoredActivationRemainingBalanceToVenue({
      activation: activationRow({
        venue_settlement_wallet_address: BASE_CAMPAIGN,
      }),
    });
    expect(result).toMatchObject({
      ok: false,
      error: 'Venue wallet must differ from the campaign wallet.',
    });
  });

  describe('Solana CADD', () => {
    beforeEach(() => {
      mockFetchSolanaSplTokenBalance.mockResolvedValue(120.5);
      mockLoadActivationReservedUsdc.mockResolvedValue(35);
      mockBuildSolanaTransfer.mockResolvedValue({
        ok: true,
        transaction: { tx: true },
        lastValidBlockHeight: 100,
      });
      mockSignSolanaTransfer.mockResolvedValue({
        ok: true,
        signature: 'sig-1',
        serializedTransaction: new Uint8Array([1]),
      });
      mockBroadcastSolana.mockResolvedValue({ status: 'sent' });
      mockCheckSolanaOutcome.mockResolvedValue('pending');
    });

    it('transfers the unreserved CADD to the venue and reports pending finalization', async () => {
      const result = await sendSponsoredActivationRemainingBalanceToVenue({
        activation: solanaActivation(),
      });

      expect(mockFetchSolanaSplTokenBalance).toHaveBeenCalledWith({
        ownerAddress: SOLANA_CAMPAIGN,
        mint: SOLANA_MINT,
        decimals: 6,
      });
      expect(mockBuildSolanaTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignAddress: SOLANA_CAMPAIGN,
          venueAddress: SOLANA_VENUE,
          amount: 85.5,
        })
      );
      expect(mockSignSolanaTransfer).toHaveBeenCalledWith({
        privyWalletId: 'pw-sol',
        campaignAddress: SOLANA_CAMPAIGN,
        transaction: { tx: true },
      });
      expect(result).toMatchObject({
        ok: true,
        status: 'submitted',
        txHash: 'sig-1',
        amountUsdc: 85.5,
        destinationAddress: SOLANA_VENUE,
      });
    });

    it('reports confirmed when the signature is already finalized', async () => {
      mockCheckSolanaOutcome.mockResolvedValue('success');
      const result = await sendSponsoredActivationRemainingBalanceToVenue({
        activation: solanaActivation(),
      });
      expect(result).toMatchObject({ ok: true, status: 'confirmed' });
    });

    it('surfaces a rejected broadcast', async () => {
      mockBroadcastSolana.mockResolvedValue({
        status: 'rejected',
        message: 'insufficient lamports',
      });
      const result = await sendSponsoredActivationRemainingBalanceToVenue({
        activation: solanaActivation(),
      });
      expect(result).toMatchObject({ ok: false, statusCode: 500 });
      expect(mockCheckSolanaOutcome).not.toHaveBeenCalled();
    });

    it('does not build a transfer when nothing is unreserved', async () => {
      mockFetchSolanaSplTokenBalance.mockResolvedValue(35);
      const result = await sendSponsoredActivationRemainingBalanceToVenue({
        activation: solanaActivation(),
      });
      expect(result).toMatchObject({
        ok: false,
        error: 'No unreserved CADD left to send to the venue.',
      });
      expect(mockBuildSolanaTransfer).not.toHaveBeenCalled();
    });
  });
});

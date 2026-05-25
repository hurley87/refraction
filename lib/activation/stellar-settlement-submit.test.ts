import { Account } from '@stellar/stellar-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const CAMPAIGN = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const VENUE = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
const ISSUER = CAMPAIGN;

const hoisted = vi.hoisted(() => ({
  mockRawSign: vi.fn(),
  mockServer: {
    loadAccount: vi.fn(),
    fetchBaseFee: vi.fn(),
    submitTransaction: vi.fn(),
  },
}));

vi.mock('@/lib/privy-server-rest', () => ({
  privyWalletRawSignTransactionHash: (...args: unknown[]) =>
    hoisted.mockRawSign(...args),
}));

vi.mock('@/lib/spend/stellar-wallet-readiness-config', async () => {
  const { Keypair, Networks } = await import('@stellar/stellar-sdk');
  const sponsor = Keypair.random();
  return {
    createStellarSpendHorizonServer: () => hoisted.mockServer,
    getStellarSpendNetworkPassphrase: () => Networks.TESTNET,
    parseStellarSpendSponsorKeypair: () => sponsor,
  };
});

import {
  parseStellarSettlementAssetConfig,
  submitStellarActivationSettlementFromCampaign,
} from './stellar-settlement-submit';

describe('parseStellarSettlementAssetConfig', () => {
  it('accepts valid activation usdc_asset_config', () => {
    const r = parseStellarSettlementAssetConfig({
      asset_code: 'USDC',
      issuer: CAMPAIGN,
    });
    expect(r.ok).toBe(true);
  });

  it('rejects invalid config', () => {
    const r = parseStellarSettlementAssetConfig({});
    expect(r.ok).toBe(false);
  });
});

describe('submitStellarActivationSettlementFromCampaign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.mockRawSign.mockResolvedValue(Buffer.alloc(64));
    hoisted.mockServer.loadAccount.mockResolvedValue(
      new Account(CAMPAIGN, '1')
    );
    hoisted.mockServer.fetchBaseFee.mockResolvedValue(100);
  });

  it('builds campaign-sponsored payment with activation asset config', async () => {
    hoisted.mockServer.submitTransaction.mockResolvedValue({ hash: 'abc123' });

    const result = await submitStellarActivationSettlementFromCampaign({
      campaignPublicKey: CAMPAIGN,
      privyCampaignWalletId: 'campaign-wallet-id',
      venueSettlementPublicKey: VENUE,
      usdcAmount: 2.5,
      usdcAssetConfig: { asset_code: 'USDC', issuer: ISSUER },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.txHash).toBe('abc123');
    }
    expect(hoisted.mockRawSign).toHaveBeenCalledWith(
      expect.objectContaining({ walletId: 'campaign-wallet-id' })
    );
    const feeBump = hoisted.mockServer.submitTransaction.mock.calls[0]?.[0];
    const operations = feeBump.innerTransaction.operations;
    expect(operations.map((op: { type: string }) => op.type)).toEqual([
      'beginSponsoringFutureReserves',
      'payment',
      'endSponsoringFutureReserves',
    ]);
    expect(operations[1].destination).toBe(VENUE);
    expect(operations[2].source).toBe(CAMPAIGN);
  });

  it('maps insufficient balance to insufficient_usdc_or_reserve', async () => {
    hoisted.mockServer.submitTransaction.mockRejectedValue(
      Object.assign(new Error('op_underfunded'), {
        response: {
          data: {
            extras: { result_codes: { operations: ['op_underfunded'] } },
          },
        },
      })
    );

    const result = await submitStellarActivationSettlementFromCampaign({
      campaignPublicKey: CAMPAIGN,
      privyCampaignWalletId: 'pw',
      venueSettlementPublicKey: VENUE,
      usdcAmount: 1,
      usdcAssetConfig: { asset_code: 'USDC', issuer: ISSUER },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('insufficient_usdc_or_reserve');
    }
  });
});

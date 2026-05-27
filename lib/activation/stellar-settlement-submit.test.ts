import { Account, Keypair } from '@stellar/stellar-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const VENUE = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';

const hoisted = vi.hoisted(() => ({
  campaignKp: null as import('@stellar/stellar-sdk').Keypair | null,
  mockServer: {
    loadAccount: vi.fn(),
    fetchBaseFee: vi.fn(),
    submitTransaction: vi.fn(),
  },
}));

vi.mock('@/lib/activation/stellar-campaign-wallet-config', () => ({
  parseStellarSponsoredCampaignKeypair: () => {
    if (!hoisted.campaignKp) {
      throw new Error('missing campaign key');
    }
    return hoisted.campaignKp;
  },
}));

vi.mock('@/lib/spend/stellar-wallet-readiness-config', async () => {
  const { Networks } = await import('@stellar/stellar-sdk');
  return {
    createStellarSpendHorizonServer: () => hoisted.mockServer,
    getStellarSpendNetworkPassphrase: () => Networks.TESTNET,
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
      issuer: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
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
    hoisted.campaignKp = Keypair.random();
    hoisted.mockServer.loadAccount.mockResolvedValue(
      new Account(hoisted.campaignKp.publicKey(), '1')
    );
    hoisted.mockServer.fetchBaseFee.mockResolvedValue(100);
  });

  it('submits a direct USDC payment signed by the configured campaign wallet', async () => {
    hoisted.mockServer.submitTransaction.mockResolvedValue({ hash: 'abc123' });
    const campaign = hoisted.campaignKp.publicKey();

    const result = await submitStellarActivationSettlementFromCampaign({
      campaignPublicKey: campaign,
      venueSettlementPublicKey: VENUE,
      usdcAmount: 2.5,
      usdcAssetConfig: { asset_code: 'USDC', issuer: campaign },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.txHash).toBe('abc123');
    }
    const tx = hoisted.mockServer.submitTransaction.mock.calls[0]?.[0];
    expect(tx.operations.map((op: { type: string }) => op.type)).toEqual([
      'payment',
    ]);
    expect(tx.operations[0].destination).toBe(VENUE);
  });

  it('maps insufficient balance to insufficient_usdc_or_reserve', async () => {
    const campaign = hoisted.campaignKp.publicKey();
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
      campaignPublicKey: campaign,
      venueSettlementPublicKey: VENUE,
      usdcAmount: 1,
      usdcAssetConfig: { asset_code: 'USDC', issuer: campaign },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('insufficient_usdc_or_reserve');
    }
  });

  it('rejects when activation campaign address does not match configured wallet', async () => {
    const result = await submitStellarActivationSettlementFromCampaign({
      campaignPublicKey:
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      venueSettlementPublicKey: VENUE,
      usdcAmount: 1,
      usdcAssetConfig: {
        asset_code: 'USDC',
        issuer: hoisted.campaignKp.publicKey(),
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('stellar_campaign_wallet_mismatch');
    }
  });
});

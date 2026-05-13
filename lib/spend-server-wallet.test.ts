import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getSpendServerWalletTransferConfig,
  spendServerWalletFundingMetadata,
} from './spend-server-wallet';

const VALID_STELLAR =
  'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';

describe('spendServerWalletFundingMetadata', () => {
  it('uses the Base server wallet stored on the experience before env fallback', () => {
    const experience = {
      spend_rail: 'base_usdc' as const,
      max_usdc_per_user: 5,
      privy_server_wallet_id: 'wallet-exp-1',
      server_wallet_address: '0x9999999999999999999999999999999999999999',
    };

    expect(getSpendServerWalletTransferConfig(experience)).toEqual({
      walletId: 'wallet-exp-1',
      address: '0x9999999999999999999999999999999999999999',
    });
    expect(
      spendServerWalletFundingMetadata(experience, null).serverWalletAddress
    ).toBe('0x9999999999999999999999999999999999999999');
  });

  it('includes Base-specific funding copy and chain for base_usdc', () => {
    const m = spendServerWalletFundingMetadata(
      { spend_rail: 'base_usdc', max_usdc_per_user: 5 },
      null
    );
    expect(m.spendRail).toBe('base_usdc');
    expect(m.chain).toBe('base-mainnet');
    expect(m.paymentNetworkDisplayName).toBe('Base USDC');
    expect(m.fundingNetworkLabel).toBe('Base');
    expect(m.fundingCalloutTitle).toBe('Fund the server wallet');
    expect(m.fundingCalloutBody).toContain('Base');
    expect(m.fundingCalloutBody).not.toMatch(/Privy/i);
  });

  const prevStellar: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of [
      'SPEND_RAIL_STELLAR_USDC_ENABLED',
      'SPEND_RAIL_STELLAR_USDC_RECEIVING_ADDRESS',
      'SPEND_RAIL_STELLAR_USDC_TREASURY_ADDRESS',
    ]) {
      prevStellar[k] = process.env[k];
    }
    process.env.SPEND_RAIL_STELLAR_USDC_ENABLED = 'true';
    process.env.SPEND_RAIL_STELLAR_USDC_RECEIVING_ADDRESS = VALID_STELLAR;
    delete process.env.SPEND_RAIL_STELLAR_USDC_TREASURY_ADDRESS;
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(prevStellar)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('includes Stellar treasury copy for stellar_usdc', () => {
    const m = spendServerWalletFundingMetadata(
      { spend_rail: 'stellar_usdc', max_usdc_per_user: 3 },
      null
    );
    expect(m.spendRail).toBe('stellar_usdc');
    expect(m.chain).toBe('stellar');
    expect(m.paymentNetworkDisplayName).toBe('Stellar USDC');
    expect(m.fundingNetworkLabel).toBe('Stellar');
    expect(m.fundingCalloutTitle).toBe('Fund the Stellar treasury');
    expect(m.fundingCalloutBody).toContain('Stellar');
    expect(m.fundingCalloutBody).not.toContain('Base');
  });
});

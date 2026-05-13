import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readStellarTreasuryConfirmedUsdcBalance } from '@/lib/spend/stellar-treasury-funding';
import { fetchUsdcBalanceOnBase } from '@/lib/walletconnect-poster-direct-usdc';

vi.mock('@/lib/spend/stellar-treasury-funding');
vi.mock('@/lib/walletconnect-poster-direct-usdc', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@/lib/walletconnect-poster-direct-usdc')
    >();
  return {
    ...actual,
    fetchUsdcBalanceOnBase: vi.fn(),
  };
});

import {
  fetchServerWalletUsdcBalanceSafe,
  spendServerWalletFundingMetadata,
} from './spend-server-wallet';

const VALID_STELLAR =
  'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';

const BASE_TREASURY = '0x1414141414141414141414141414141414141414' as const;

describe('spendServerWalletFundingMetadata', () => {
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

  it('marks stellar_usdc as funded when balance meets max_usdc_per_user', () => {
    const m = spendServerWalletFundingMetadata(
      { spend_rail: 'stellar_usdc', max_usdc_per_user: 5 },
      5
    );
    expect(m.funded).toBe(true);
    expect(m.usdcBalance).toBe(5);
  });

  it('marks stellar_usdc as funded when balance exceeds max_usdc_per_user', () => {
    const m = spendServerWalletFundingMetadata(
      { spend_rail: 'stellar_usdc', max_usdc_per_user: 2 },
      10.5
    );
    expect(m.funded).toBe(true);
  });

  it('marks stellar_usdc as not funded when balance is below minimum', () => {
    const m = spendServerWalletFundingMetadata(
      { spend_rail: 'stellar_usdc', max_usdc_per_user: 5 },
      4.99
    );
    expect(m.funded).toBe(false);
  });
});

describe('fetchServerWalletUsdcBalanceSafe', () => {
  const prevBaseTreasury =
    process.env.SPEND_RAIL_BASE_USDC_TREASURY_WALLET_ADDRESS;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SPEND_RAIL_BASE_USDC_TREASURY_WALLET_ADDRESS = BASE_TREASURY;
  });

  afterEach(() => {
    if (prevBaseTreasury === undefined) {
      delete process.env.SPEND_RAIL_BASE_USDC_TREASURY_WALLET_ADDRESS;
    } else {
      process.env.SPEND_RAIL_BASE_USDC_TREASURY_WALLET_ADDRESS =
        prevBaseTreasury;
    }
  });

  it('uses fetchUsdcBalanceOnBase for base_usdc', async () => {
    vi.mocked(fetchUsdcBalanceOnBase).mockResolvedValue(42.25);
    const balance = await fetchServerWalletUsdcBalanceSafe({
      spend_rail: 'base_usdc',
    });
    expect(balance).toBe(42.25);
    expect(fetchUsdcBalanceOnBase).toHaveBeenCalledTimes(1);
    expect(readStellarTreasuryConfirmedUsdcBalance).not.toHaveBeenCalled();
  });

  it('uses readStellarTreasuryConfirmedUsdcBalance for stellar_usdc', async () => {
    vi.mocked(readStellarTreasuryConfirmedUsdcBalance).mockResolvedValue(88);
    const balance = await fetchServerWalletUsdcBalanceSafe({
      spend_rail: 'stellar_usdc',
    });
    expect(balance).toBe(88);
    expect(readStellarTreasuryConfirmedUsdcBalance).toHaveBeenCalledTimes(1);
    expect(fetchUsdcBalanceOnBase).not.toHaveBeenCalled();
  });

  it('returns null and logs when Stellar balance read fails', async () => {
    const err = new Error('horizon down');
    vi.mocked(readStellarTreasuryConfirmedUsdcBalance).mockRejectedValue(err);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const balance = await fetchServerWalletUsdcBalanceSafe({
      spend_rail: 'stellar_usdc',
    });

    expect(balance).toBeNull();
    expect(spy).toHaveBeenCalledWith(
      'fetchServerWalletUsdcBalanceSafe stellar:',
      err
    );
    spy.mockRestore();
  });
});

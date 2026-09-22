import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetchSolanaMintDecimals = vi.fn();

vi.mock('@/lib/activation/solana-token-rpc', () => ({
  fetchSolanaMintDecimals: (...args: unknown[]) =>
    mockFetchSolanaMintDecimals(...args),
}));

import { resolveSolanaCaddSponsoredActivationAssetConfig } from '@/lib/activation/solana-cadd-asset-config';
import { SolanaCaddConfigError } from '@/lib/activation/solana-config';

const TEST_CADD_MINT = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CADD_MINT', TEST_CADD_MINT);
  vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CADD_DECIMALS', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('resolveSolanaCaddSponsoredActivationAssetConfig', () => {
  it('uses the on-chain mint precision (not a USDC default)', async () => {
    mockFetchSolanaMintDecimals.mockResolvedValue(9);
    await expect(
      resolveSolanaCaddSponsoredActivationAssetConfig()
    ).resolves.toEqual({ mint: TEST_CADD_MINT, decimals: 9, symbol: 'CADD' });
    expect(mockFetchSolanaMintDecimals).toHaveBeenCalledWith({
      mint: TEST_CADD_MINT,
    });
  });

  it('accepts pinned decimals that match the chain', async () => {
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CADD_DECIMALS', '9');
    mockFetchSolanaMintDecimals.mockResolvedValue(9);
    await expect(
      resolveSolanaCaddSponsoredActivationAssetConfig()
    ).resolves.toMatchObject({ decimals: 9 });
  });

  it('rejects pinned decimals that disagree with the chain', async () => {
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CADD_DECIMALS', '6');
    mockFetchSolanaMintDecimals.mockResolvedValue(9);
    await expect(
      resolveSolanaCaddSponsoredActivationAssetConfig()
    ).rejects.toThrow(
      'SPONSORED_ACTIVATION_SOLANA_CADD_DECIMALS (6) does not match the on-chain mint decimals (9)'
    );
  });

  it('falls back to pinned decimals when the RPC is unreachable', async () => {
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CADD_DECIMALS', '9');
    mockFetchSolanaMintDecimals.mockRejectedValue(new Error('rpc down'));
    await expect(
      resolveSolanaCaddSponsoredActivationAssetConfig()
    ).resolves.toEqual({ mint: TEST_CADD_MINT, decimals: 9, symbol: 'CADD' });
  });

  it('fails when precision can be neither verified nor configured', async () => {
    mockFetchSolanaMintDecimals.mockRejectedValue(
      new Error('Solana mint account not found')
    );
    const result = resolveSolanaCaddSponsoredActivationAssetConfig();
    await expect(result).rejects.toBeInstanceOf(SolanaCaddConfigError);
    await expect(
      resolveSolanaCaddSponsoredActivationAssetConfig()
    ).rejects.toThrow(/Solana mint account not found/);
  });

  it('fails without calling the RPC when no mint is configured', async () => {
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CADD_MINT', '');
    await expect(
      resolveSolanaCaddSponsoredActivationAssetConfig()
    ).rejects.toThrow(
      'SPONSORED_ACTIVATION_SOLANA_CADD_MINT is not configured'
    );
    expect(mockFetchSolanaMintDecimals).not.toHaveBeenCalled();
  });
});

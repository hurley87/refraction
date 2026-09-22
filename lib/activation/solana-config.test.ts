import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatSolscanAccountUrl,
  formatSolscanTxUrl,
  getSolanaCaddEnvConfig,
  getSolanaRpcUrl,
  getSolscanTxUrlTemplate,
  isSolanaAddress,
  isValidSolanaTokenDecimals,
  SolanaCaddConfigError,
  tryGetSolanaCaddMint,
} from '@/lib/activation/solana-config';

const WALLET = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
/** Test-only stand-in for the deployment-supplied CADD mint. */
const TEST_CADD_MINT = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const SIGNATURE =
  '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isSolanaAddress', () => {
  it('accepts a 32-byte base58 address and rejects other formats', () => {
    expect(isSolanaAddress(WALLET)).toBe(true);
    expect(isSolanaAddress(` ${WALLET} `)).toBe(true);
    expect(isSolanaAddress('0x70997970C51812dc3A010C7d01b50e0d17dc79C8')).toBe(
      false
    );
    expect(isSolanaAddress('')).toBe(false);
  });
});

describe('isValidSolanaTokenDecimals', () => {
  it('accepts integer precisions from 0 to 18', () => {
    for (const d of [0, 6, 9, 18])
      expect(isValidSolanaTokenDecimals(d)).toBe(true);
  });

  it('rejects out-of-range and non-integer precisions', () => {
    for (const d of [-1, 19, 6.5, NaN, '6']) {
      expect(isValidSolanaTokenDecimals(d)).toBe(false);
    }
  });
});

describe('Solana CADD env config', () => {
  it('has no default mint', () => {
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CADD_MINT', '');
    expect(tryGetSolanaCaddMint()).toBeNull();
    expect(() => getSolanaCaddEnvConfig()).toThrow(SolanaCaddConfigError);
    expect(() => getSolanaCaddEnvConfig()).toThrow(
      'SPONSORED_ACTIVATION_SOLANA_CADD_MINT is not configured'
    );
  });

  it('rejects a mint that is not a Solana address', () => {
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CADD_MINT', '0xabc');
    expect(tryGetSolanaCaddMint()).toBeNull();
    expect(() => getSolanaCaddEnvConfig()).toThrow(
      'SPONSORED_ACTIVATION_SOLANA_CADD_MINT is not a valid Solana address'
    );
  });

  it('returns the configured mint with unpinned decimals', () => {
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CADD_MINT', ` ${TEST_CADD_MINT} `);
    expect(tryGetSolanaCaddMint()).toBe(TEST_CADD_MINT);
    expect(getSolanaCaddEnvConfig()).toEqual({
      mint: TEST_CADD_MINT,
      decimals: null,
    });
  });

  it('parses pinned decimals and rejects invalid values', () => {
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CADD_MINT', TEST_CADD_MINT);
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CADD_DECIMALS', '9');
    expect(getSolanaCaddEnvConfig().decimals).toBe(9);
    for (const bad of ['19', '-1', '6.5', 'six']) {
      vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CADD_DECIMALS', bad);
      expect(() => getSolanaCaddEnvConfig()).toThrow(
        'SPONSORED_ACTIVATION_SOLANA_CADD_DECIMALS must be an integer between 0 and 18'
      );
    }
  });
});

describe('Solana RPC URL', () => {
  it('defaults per cluster and honors an override', () => {
    expect(getSolanaRpcUrl()).toBe('https://api.mainnet-beta.solana.com');
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CLUSTER', 'devnet');
    expect(getSolanaRpcUrl()).toBe('https://api.devnet.solana.com');
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_RPC_URL', 'https://rpc.example');
    expect(getSolanaRpcUrl()).toBe('https://rpc.example');
  });
});

describe('Solscan links', () => {
  it('builds mainnet account and transaction URLs', () => {
    expect(formatSolscanAccountUrl(WALLET)).toBe(
      `https://solscan.io/account/${WALLET}`
    );
    expect(getSolscanTxUrlTemplate()).toBe('https://solscan.io/tx/{txHash}');
    expect(formatSolscanTxUrl(SIGNATURE)).toBe(
      `https://solscan.io/tx/${SIGNATURE}`
    );
  });

  it('adds the devnet cluster query', () => {
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CLUSTER', 'devnet');
    expect(formatSolscanAccountUrl(WALLET)).toBe(
      `https://solscan.io/account/${WALLET}?cluster=devnet`
    );
    expect(formatSolscanTxUrl(SIGNATURE)).toBe(
      `https://solscan.io/tx/${SIGNATURE}?cluster=devnet`
    );
  });

  it('returns null for invalid input', () => {
    expect(formatSolscanAccountUrl('0xabc')).toBeNull();
    expect(formatSolscanAccountUrl(null)).toBeNull();
    expect(formatSolscanTxUrl(`0x${'a'.repeat(64)}`)).toBeNull();
    expect(formatSolscanTxUrl('')).toBeNull();
  });
});

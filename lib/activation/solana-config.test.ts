import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatSolscanAccountUrl,
  formatSolscanTxUrl,
  getDefaultSolanaSponsoredActivationAssetConfig,
  getSolanaRpcUrl,
  getSolanaUsdcMint,
  getSolscanTxUrlTemplate,
  isSolanaAddress,
  SOLANA_USDC_MINT_BY_CLUSTER,
} from '@/lib/activation/solana-config';

const WALLET = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
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

describe('Solana USDC asset configuration', () => {
  it('defaults to mainnet Circle USDC with 6 decimals', () => {
    expect(getDefaultSolanaSponsoredActivationAssetConfig()).toEqual({
      mint: SOLANA_USDC_MINT_BY_CLUSTER['mainnet-beta'],
      decimals: 6,
      symbol: 'USDC',
    });
  });

  it('switches mint and RPC with the devnet cluster', () => {
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CLUSTER', 'devnet');
    expect(getSolanaUsdcMint()).toBe(SOLANA_USDC_MINT_BY_CLUSTER.devnet);
    expect(getSolanaRpcUrl()).toBe('https://api.devnet.solana.com');
  });

  it('honors a valid mint override and rejects an invalid one', () => {
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_USDC_MINT', WALLET);
    expect(getSolanaUsdcMint()).toBe(WALLET);
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_USDC_MINT', 'not-a-mint');
    expect(() => getSolanaUsdcMint()).toThrow(
      'SPONSORED_ACTIVATION_SOLANA_USDC_MINT is not a valid Solana address'
    );
  });

  it('honors an RPC URL override', () => {
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

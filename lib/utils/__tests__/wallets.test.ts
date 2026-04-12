import { describe, it, expect } from 'vitest';
import { getAddress } from 'viem';
import { sameWalletAddress, tryNormalizeEvmAddress } from '../wallets';

describe('tryNormalizeEvmAddress', () => {
  it('returns checksummed address for valid EVM input', () => {
    const raw = '0x0000000000000000000000000000000000000001';
    expect(tryNormalizeEvmAddress(raw)).toBe(getAddress(raw as `0x${string}`));
  });

  it('returns null for non-EVM strings', () => {
    expect(
      tryNormalizeEvmAddress('4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T')
    ).toBe(null);
  });
});

describe('sameWalletAddress', () => {
  it('matches EVM addresses across casing', () => {
    const a = '0x0000000000000000000000000000000000000001';
    const b = getAddress(a as `0x${string}`);
    expect(sameWalletAddress(a.toLowerCase(), b)).toBe(true);
  });

  it('requires exact match for non-EVM', () => {
    const s = 'SoMeSoLaNaAddReSs';
    expect(sameWalletAddress(s, s)).toBe(true);
    expect(sameWalletAddress(s, s.toLowerCase())).toBe(false);
  });

  it('returns false when either side is empty', () => {
    const addr = '0x0000000000000000000000000000000000000001';
    expect(sameWalletAddress('', addr)).toBe(false);
    expect(sameWalletAddress(addr, '')).toBe(false);
  });
});

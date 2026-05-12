import { describe, it, expect } from 'vitest';
import {
  explorerTxUrlForSpendLedger,
  isLedgerCanonicalEvmTxHash,
  isStellarTransactionHash,
  isValidSpendConversionFundingTxReference,
  spendLedgerNetworkLabel,
} from '@/lib/spend-ledger-explorer-url';

describe('spendLedgerNetworkLabel', () => {
  it('maps rails to snapshot labels', () => {
    expect(spendLedgerNetworkLabel('base_usdc')).toBe('Base');
    expect(spendLedgerNetworkLabel('stellar_usdc')).toBe('Stellar');
  });
});

describe('isLedgerCanonicalEvmTxHash', () => {
  it('accepts 0x + 64 hex', () => {
    expect(isLedgerCanonicalEvmTxHash('0x' + 'a'.repeat(64))).toBe(true);
  });
  it('rejects short hashes', () => {
    expect(isLedgerCanonicalEvmTxHash('0xabc')).toBe(false);
  });
});

describe('isStellarTransactionHash', () => {
  it('accepts 64 hex without 0x prefix', () => {
    expect(isStellarTransactionHash('a'.repeat(64))).toBe(true);
  });
  it('rejects EVM-shaped hashes', () => {
    expect(isStellarTransactionHash('0x' + 'a'.repeat(64))).toBe(false);
  });
});

describe('isValidSpendConversionFundingTxReference', () => {
  it('accepts EVM hash on base_usdc', () => {
    expect(
      isValidSpendConversionFundingTxReference(
        'base_usdc',
        '0x' + 'c'.repeat(64)
      )
    ).toBe(true);
  });
  it('accepts stellar hash on stellar_usdc', () => {
    expect(
      isValidSpendConversionFundingTxReference('stellar_usdc', 'd'.repeat(64))
    ).toBe(true);
  });
  it('rejects stellar hash on base_usdc', () => {
    expect(
      isValidSpendConversionFundingTxReference('base_usdc', 'd'.repeat(64))
    ).toBe(false);
  });
});

describe('explorerTxUrlForSpendLedger', () => {
  it('returns null for pending placeholders', () => {
    expect(
      explorerTxUrlForSpendLedger('base_usdc', 'pending:privy-tx-123')
    ).toBeNull();
  });

  it('returns basescan URL for Base EVM hashes', () => {
    const h =
      '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    expect(explorerTxUrlForSpendLedger('base_usdc', h)).toBe(
      'https://basescan.org/tx/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    );
  });

  it('uses BaseScan for EVM-shaped hashes even when spend rail is Stellar', () => {
    const h =
      '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
    expect(explorerTxUrlForSpendLedger('stellar_usdc', h)).toBe(
      'https://basescan.org/tx/0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    );
  });

  it('returns stellar expert URL for stellar rail', () => {
    expect(
      explorerTxUrlForSpendLedger(
        'stellar_usdc',
        'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
      )
    ).toMatch(/^https:\/\/stellar\.expert\/explorer\/(public|testnet)\/tx\//);
  });
});

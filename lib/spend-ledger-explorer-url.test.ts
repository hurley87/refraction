import { describe, it, expect } from 'vitest';
import {
  explorerTxUrlForSpendLedger,
  spendLedgerNetworkLabel,
} from '@/lib/spend-ledger-explorer-url';

describe('spendLedgerNetworkLabel', () => {
  it('maps rails to snapshot labels', () => {
    expect(spendLedgerNetworkLabel('base_usdc')).toBe('Base');
    expect(spendLedgerNetworkLabel('stellar_usdc')).toBe('Stellar');
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

import { describe, it, expect } from 'vitest';
import {
  formatExplorerTxUrlForSpendLedger,
  formatSettlementExplorerTxUrl,
  formatSettlementWalletExplorerUrl,
  getSettlementExplorerTxUrlTemplate,
} from '@/lib/spend-rail-config/index';

describe('settlement explorer helpers (sponsored activation)', () => {
  it('exposes tx templates for base, stellar, and Tempo rails', () => {
    expect(getSettlementExplorerTxUrlTemplate('base')).toContain('{txHash}');
    expect(getSettlementExplorerTxUrlTemplate('stellar')).toContain('{txHash}');
    expect(getSettlementExplorerTxUrlTemplate('tempo')).toBe(
      'https://explore.tempo.xyz/tx/{txHash}'
    );
  });

  it('delegates settlement tx URLs to spend ledger formatter', () => {
    const h =
      '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    expect(formatSettlementExplorerTxUrl('base', h)).toBe(
      formatExplorerTxUrlForSpendLedger('base_usdc', h)
    );
  });

  it('builds Base wallet explorer URL from template origin', () => {
    expect(
      formatSettlementWalletExplorerUrl(
        'base',
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
      )
    ).toBe(
      'https://basescan.org/address/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
    );
  });

  it('returns null for invalid Base wallet input', () => {
    expect(formatSettlementWalletExplorerUrl('base', '0xbad')).toBeNull();
  });

  it('builds Tempo transaction and wallet explorer URLs', () => {
    const hash = `0x${'a'.repeat(64)}`;
    expect(formatSettlementExplorerTxUrl('tempo', hash)).toBe(
      `https://explore.tempo.xyz/tx/${hash}`
    );
    expect(
      formatSettlementWalletExplorerUrl(
        'tempo',
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
      )
    ).toBe(
      'https://explore.tempo.xyz/address/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
    );
  });

  it('builds Stellar account explorer URL', () => {
    const g = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
    const url = formatSettlementWalletExplorerUrl('stellar', g);
    expect(url).toContain('/account/');
    expect(url).toContain(encodeURIComponent(g));
  });
});

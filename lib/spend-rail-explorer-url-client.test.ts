import { describe, it, expect } from 'vitest';
import {
  formatSpendPaymentExplorerUrl,
  spendPaymentExplorerLinkLabel,
} from '@/lib/spend-rail-explorer-url-client';

describe('formatSpendPaymentExplorerUrl', () => {
  it('returns null for pending placeholders', () => {
    expect(
      formatSpendPaymentExplorerUrl(
        'https://basescan.org/tx/{txHash}',
        'pending:privy-1'
      )
    ).toBeNull();
  });

  it('lowercases EVM hashes', () => {
    const h =
      '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    expect(
      formatSpendPaymentExplorerUrl('https://basescan.org/tx/{txHash}', h)
    ).toBe(
      'https://basescan.org/tx/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    );
  });

  it('encodes non-EVM hashes for Stellar-style templates', () => {
    const tpl = 'https://stellar.expert/explorer/public/tx/{txHash}';
    const h = 'abc def';
    expect(formatSpendPaymentExplorerUrl(tpl, h)).toContain('abc%20def');
  });
});

describe('spendPaymentExplorerLinkLabel', () => {
  it('extracts hostname from template', () => {
    expect(
      spendPaymentExplorerLinkLabel('https://basescan.org/tx/{txHash}')
    ).toBe('View payment on basescan.org');
  });

  it('falls back when template is unusable', () => {
    expect(spendPaymentExplorerLinkLabel(null)).toBe(
      'View payment transaction'
    );
  });
});

import { describe, it, expect } from 'vitest';
import {
  formatSpendPaymentExplorerUrl,
  isSafeSpendExplorerHttpsUrl,
  resolveSpendReceiptPaymentExplorerUrl,
  spendPaymentExplorerLinkLabel,
  spendReceiptPaymentStatusLabel,
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

describe('isSafeSpendExplorerHttpsUrl', () => {
  it('accepts https URLs', () => {
    expect(
      isSafeSpendExplorerHttpsUrl(
        'https://stellar.expert/explorer/public/tx/abc'
      )
    ).toBe(true);
  });

  it('rejects javascript: and http', () => {
    expect(isSafeSpendExplorerHttpsUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeSpendExplorerHttpsUrl('http://example.com/tx/1')).toBe(false);
  });
});

describe('resolveSpendReceiptPaymentExplorerUrl', () => {
  const tpl = 'https://basescan.org/tx/{txHash}';
  const h =
    '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

  it('prefers a safe persisted URL over template substitution', () => {
    const persisted = 'https://basescan.org/tx/custom-path-recorded';
    expect(
      resolveSpendReceiptPaymentExplorerUrl({
        persistedExplorerTxUrl: persisted,
        explorerTxUrlTemplate: tpl,
        paymentTxHash: h,
      })
    ).toBe(persisted);
  });

  it('ignores persisted URL when not https and falls back to template', () => {
    expect(
      resolveSpendReceiptPaymentExplorerUrl({
        persistedExplorerTxUrl: 'javascript:evil()',
        explorerTxUrlTemplate: tpl,
        paymentTxHash: h,
      })
    ).toBe(
      'https://basescan.org/tx/0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    );
  });

  it('prefers execution snapshot URL over persisted when both are safe', () => {
    expect(
      resolveSpendReceiptPaymentExplorerUrl({
        executionSnapshotExplorerTxUrl: 'https://snapshot.example/tx/1',
        persistedExplorerTxUrl: 'https://persisted.example/tx/2',
        explorerTxUrlTemplate: tpl,
        paymentTxHash: h,
      })
    ).toBe('https://snapshot.example/tx/1');
  });
});

describe('spendPaymentExplorerLinkLabel', () => {
  it('returns View transaction', () => {
    expect(spendPaymentExplorerLinkLabel()).toBe('View transaction');
  });
});

describe('spendReceiptPaymentStatusLabel', () => {
  it('maps ledger statuses to receipt copy', () => {
    expect(spendReceiptPaymentStatusLabel('confirmed')).toBe('Complete');
    expect(spendReceiptPaymentStatusLabel('pending')).toBe('Confirming');
    expect(spendReceiptPaymentStatusLabel('submitted')).toBe('Confirming');
    expect(spendReceiptPaymentStatusLabel('failed')).toBe('Could not verify');
    expect(spendReceiptPaymentStatusLabel(undefined)).toBe('Complete');
  });
});

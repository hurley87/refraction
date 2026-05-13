import { describe, it, expect } from 'vitest';
import { isAmbiguousSpendPaymentVerifyFailure } from '@/lib/spend-payment-verify-ambiguous';

describe('isAmbiguousSpendPaymentVerifyFailure', () => {
  it('returns true for timeout / RPC / receipt-wait style reasons', () => {
    expect(
      isAmbiguousSpendPaymentVerifyFailure('waitForTransactionReceipt timeout')
    ).toBe(true);
    expect(isAmbiguousSpendPaymentVerifyFailure('RPC not configured')).toBe(
      true
    );
    expect(
      isAmbiguousSpendPaymentVerifyFailure('receipt wait failed: network')
    ).toBe(true);
  });

  it('returns false for definitive on-chain outcomes', () => {
    expect(isAmbiguousSpendPaymentVerifyFailure('transaction_reverted')).toBe(
      false
    );
    expect(
      isAmbiguousSpendPaymentVerifyFailure('no_matching_usdc_transfer')
    ).toBe(false);
  });
});

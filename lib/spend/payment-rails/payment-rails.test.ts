import { describe, it, expect, vi } from 'vitest';

// Registry imports Stellar rail → stellar-rail-wallet → Privy server client (not loadable in happy-dom).
vi.mock('@/lib/privy/stellar-rail-wallet', () => ({
  ensureStellarRailUserWallet: vi.fn(),
}));

import {
  SPEND_RAIL_ANALYTICS_CODES,
  spendRailErrorConversionFundingNotSupported,
  spendRailErrorDuplicateRequest,
  spendRailErrorFundingFailed,
  spendRailErrorInvalidReceivingWallet,
  spendRailErrorNetworkUnavailable,
  spendRailErrorPaymentFailed,
  spendRailErrorRailOperationNotSupported,
  spendRailErrorTreasuryInsufficientFunds,
  spendRailErrorWalletReadinessFailed,
  spendRailErrorWalletUnavailable,
} from '@/lib/spend/payment-rails/errors';
import { getSpendPaymentRail } from '@/lib/spend/payment-rails/registry';
import {
  isTerminalSpendRailFundingStatus,
  isTerminalSpendRailPaymentStatus,
} from '@/lib/spend/payment-rails/types';

describe('SPEND_RAIL_ANALYTICS_CODES', () => {
  it('uses snake_case stable identifiers', () => {
    for (const code of Object.values(SPEND_RAIL_ANALYTICS_CODES)) {
      expect(code).toMatch(/^spend_rail_[a-z0-9_]+$/);
    }
  });
});

describe('spend rail error catalog', () => {
  const cases = [
    ['wallet', spendRailErrorWalletUnavailable, 'wallet_unavailable'],
    [
      'treasury',
      spendRailErrorTreasuryInsufficientFunds,
      'treasury_insufficient_funds',
    ],
    [
      'readiness',
      spendRailErrorWalletReadinessFailed,
      'wallet_readiness_failed',
    ],
    ['funding', spendRailErrorFundingFailed, 'funding_failed'],
    ['payment', spendRailErrorPaymentFailed, 'payment_failed'],
    ['network', spendRailErrorNetworkUnavailable, 'network_unavailable'],
    [
      'receiving',
      spendRailErrorInvalidReceivingWallet,
      'invalid_receiving_wallet',
    ],
    ['duplicate', spendRailErrorDuplicateRequest, 'duplicate_request'],
    [
      'unsupported',
      spendRailErrorRailOperationNotSupported,
      'rail_operation_not_supported',
    ],
    [
      'conversion funding unsupported',
      spendRailErrorConversionFundingNotSupported,
      'rail_operation_not_supported',
    ],
  ] as const;

  it.each(cases)(
    '%s exposes user message and analytics code',
    (_label, fn, category) => {
      const e = fn();
      expect(e.category).toBe(category);
      expect(e.userMessage.length).toBeGreaterThan(10);
      expect(e.analyticsCode).toBe(
        SPEND_RAIL_ANALYTICS_CODES[
          category as keyof typeof SPEND_RAIL_ANALYTICS_CODES
        ]
      );
    }
  );
});

describe('isTerminalSpendRailFundingStatus', () => {
  it('is true only for terminal funding statuses', () => {
    expect(isTerminalSpendRailFundingStatus('confirmed')).toBe(true);
    expect(isTerminalSpendRailFundingStatus('failed')).toBe(true);
    expect(isTerminalSpendRailFundingStatus('needs_review')).toBe(true);
    expect(isTerminalSpendRailFundingStatus('pending')).toBe(false);
    expect(isTerminalSpendRailFundingStatus('submitted')).toBe(false);
  });
});

describe('isTerminalSpendRailPaymentStatus', () => {
  it('is true only for terminal payment statuses', () => {
    expect(isTerminalSpendRailPaymentStatus('confirmed')).toBe(true);
    expect(isTerminalSpendRailPaymentStatus('failed')).toBe(true);
    expect(isTerminalSpendRailPaymentStatus('needs_review')).toBe(true);
    expect(isTerminalSpendRailPaymentStatus('prepared')).toBe(false);
    expect(isTerminalSpendRailPaymentStatus('submitted')).toBe(false);
  });
});

describe('getSpendPaymentRail', () => {
  it('returns typed Base rail with preparePayment supported for Base USDC', async () => {
    const rail = getSpendPaymentRail('base_usdc');
    expect(rail.spendRail).toBe('base_usdc');
    expect(rail.assertUserSignedOnchainPaymentConfirmSupported().ok).toBe(true);
    const res = await rail.preparePayment({
      spendSessionId: 's1',
      embeddedEvmWalletAddress: '0x1111111111111111111111111111111111111111',
      usdcAmount: 1.5,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('expected prepare ok');
    expect(res.value.status).toBe('prepared');
    expect(res.value.baseUsdc?.preparedAction.v).toBe(1);
    expect(res.value.baseUsdc?.preparedAction.evmTransactionRequest.gas).toBe(
      '100000'
    );
  });

  it('returns typed Stellar rail that rejects user-signed confirm with catalog error', () => {
    const rail = getSpendPaymentRail('stellar_usdc');
    expect(rail.spendRail).toBe('stellar_usdc');
    const gate = rail.assertUserSignedOnchainPaymentConfirmSupported();
    expect(gate.ok).toBe(false);
    if (gate.ok) throw new Error('expected failure');
    expect(gate.error.analyticsCode).toBe(
      SPEND_RAIL_ANALYTICS_CODES.rail_operation_not_supported
    );
    expect(gate.error.userMessage).toContain('not available in this release');
  });

  it('marks Stellar treasury/funding/payment/reconcile as unsupported; readiness is rail-specific', async () => {
    const rail = getSpendPaymentRail('stellar_usdc');
    const ctx = { spendSessionId: 's1', sessionOwnerPrivyUserId: 'p1' };

    await expect(rail.getTreasurySpendableBalance()).resolves.toMatchObject({
      ok: false,
    });
    await expect(rail.initiateUserFunding(ctx)).resolves.toMatchObject({
      ok: false,
    });
    await expect(rail.preparePayment(ctx)).resolves.toMatchObject({
      ok: false,
    });
    await expect(rail.confirmPayment(ctx)).resolves.toMatchObject({
      ok: false,
    });
    await expect(
      rail.reconcilePendingOperations({ spendSessionId: 's1' })
    ).resolves.toMatchObject({ ok: false });

    expect(rail.explorerUrlForLedgerTx(null)).toBeNull();
  });
});

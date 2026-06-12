import { describe, it, expect } from 'vitest';
import {
  computeStellarSharedWalletActivationWithdrawableUsdc,
  computeWithdrawableUsdc,
} from '@/lib/activation/campaign-wallet-withdraw';

describe('computeWithdrawableUsdc', () => {
  it('returns the full balance for admin refund', () => {
    expect(computeWithdrawableUsdc(10)).toBe(10);
    expect(computeWithdrawableUsdc(6.75)).toBe(6.75);
  });

  it('never returns negative withdrawable amounts', () => {
    expect(computeWithdrawableUsdc(-1)).toBe(0);
  });

  it('floors to micro-USDC precision', () => {
    expect(computeWithdrawableUsdc(1.0000004)).toBe(1.0);
  });
});

describe('computeStellarSharedWalletActivationWithdrawableUsdc', () => {
  it('uses the full shared wallet balance before peer caps', () => {
    expect(
      computeStellarSharedWalletActivationWithdrawableUsdc({
        walletBalanceUsdc: 100,
        activationBudgetRemainingUsdc: 80,
        otherActivationsBudgetRemainingUsdc: 0,
      })
    ).toBe(80);
  });

  it('caps withdrawable by this activation budget remaining and peer allocations', () => {
    expect(
      computeStellarSharedWalletActivationWithdrawableUsdc({
        walletBalanceUsdc: 100,
        activationBudgetRemainingUsdc: 60,
        otherActivationsBudgetRemainingUsdc: 60,
      })
    ).toBe(40);
  });

  it('does not withhold reserved amounts from the shared pool', () => {
    expect(
      computeStellarSharedWalletActivationWithdrawableUsdc({
        walletBalanceUsdc: 50,
        activationBudgetRemainingUsdc: 50,
        otherActivationsBudgetRemainingUsdc: 0,
      })
    ).toBe(50);
  });
});

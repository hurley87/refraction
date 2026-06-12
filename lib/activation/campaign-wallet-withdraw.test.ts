import { describe, it, expect } from 'vitest';
import {
  computeStellarSharedWalletActivationWithdrawableUsdc,
  computeWithdrawableUsdc,
} from '@/lib/activation/campaign-wallet-withdraw';

describe('computeWithdrawableUsdc', () => {
  it('subtracts reserved USDC from balance', () => {
    expect(computeWithdrawableUsdc(10, 3.25)).toBe(6.75);
  });

  it('never returns negative withdrawable amounts', () => {
    expect(computeWithdrawableUsdc(2, 5)).toBe(0);
  });

  it('returns full balance when nothing is reserved', () => {
    expect(computeWithdrawableUsdc(4.5, 0)).toBe(4.5);
  });
});

describe('computeStellarSharedWalletActivationWithdrawableUsdc', () => {
  it('subtracts reservations from all activations on the shared wallet', () => {
    expect(
      computeStellarSharedWalletActivationWithdrawableUsdc({
        walletBalanceUsdc: 100,
        sharedWalletReservedUsdc: 25,
        activationBudgetRemainingUsdc: 80,
        otherActivationsBudgetRemainingUsdc: 0,
      })
    ).toBe(75);
  });

  it('caps withdrawable by this activation budget remaining and peer allocations', () => {
    expect(
      computeStellarSharedWalletActivationWithdrawableUsdc({
        walletBalanceUsdc: 100,
        sharedWalletReservedUsdc: 0,
        activationBudgetRemainingUsdc: 60,
        otherActivationsBudgetRemainingUsdc: 60,
      })
    ).toBe(40);
  });

  it('never returns negative withdrawable amounts', () => {
    expect(
      computeStellarSharedWalletActivationWithdrawableUsdc({
        walletBalanceUsdc: 50,
        sharedWalletReservedUsdc: 60,
        activationBudgetRemainingUsdc: 10,
        otherActivationsBudgetRemainingUsdc: 0,
      })
    ).toBe(0);
  });
});

import { describe, it, expect } from 'vitest';
import {
  computeBudgetRemainingUsdc,
  computeRedemptionsRemaining,
  computeReservedUsdcFromRaw,
} from '../sponsored-activation-admin';

describe('sponsored-activation-admin helpers', () => {
  it('computes reserved USDC from inflight settlements and committed redemptions', () => {
    expect(
      computeReservedUsdcFromRaw({
        inflightSettlementRows: [{ amount: 1.5 }, { amount: 0.5 }],
        committedRedemptionRows: [
          { usdc_amount_snapshot: 2 },
          { usdc_amount_snapshot: 0 },
          { usdc_amount_snapshot: null },
        ],
      })
    ).toBe(4);
  });

  it('computes budget remaining when capped', () => {
    expect(
      computeBudgetRemainingUsdc({
        maxUsdcBudget: 100,
        usdcSettledTotal: 10,
        reservedUsdc: 15,
      })
    ).toBe(75);
  });

  it('returns null budget remaining when there is no cap', () => {
    expect(
      computeBudgetRemainingUsdc({
        maxUsdcBudget: null,
        usdcSettledTotal: 10,
        reservedUsdc: 5,
      })
    ).toBeNull();
  });

  it('computes redemptions remaining from activation counters', () => {
    expect(
      computeRedemptionsRemaining({
        maxRedemptions: 10,
        redemptionCountConfirmed: 3,
      })
    ).toBe(7);
  });

  it('returns null redemptions remaining when uncapped', () => {
    expect(
      computeRedemptionsRemaining({
        maxRedemptions: null,
        redemptionCountConfirmed: 99,
      })
    ).toBeNull();
  });

  it('never returns negative redemptions remaining', () => {
    expect(
      computeRedemptionsRemaining({
        maxRedemptions: 2,
        redemptionCountConfirmed: 5,
      })
    ).toBe(0);
  });
});

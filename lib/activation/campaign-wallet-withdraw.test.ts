import { describe, it, expect } from 'vitest';
import { computeWithdrawableUsdc } from '@/lib/activation/campaign-wallet-withdraw';

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

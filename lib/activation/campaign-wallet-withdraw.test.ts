import { describe, it, expect } from 'vitest';
import { computeWithdrawableUsdc } from '@/lib/activation/campaign-wallet-withdraw';

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

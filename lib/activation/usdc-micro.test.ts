import { describe, it, expect } from 'vitest';
import { balanceUsdcToMicro } from '@/lib/activation/usdc-micro';

describe('balanceUsdcToMicro', () => {
  it('floors balances to micro-USDC precision', () => {
    expect(balanceUsdcToMicro(10)).toBe(10_000_000);
    expect(balanceUsdcToMicro(6.75)).toBe(6_750_000);
    expect(balanceUsdcToMicro(1.0000004)).toBe(1_000_000);
  });

  it('never returns negative micro amounts', () => {
    expect(balanceUsdcToMicro(-1)).toBe(0);
  });
});

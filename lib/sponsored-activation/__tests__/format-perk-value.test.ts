import { describe, expect, it } from 'vitest';
import {
  formatPerkValueUsdLabel,
  perkValueUsdFromUsdcAmount,
} from '@/lib/sponsored-activation/format-perk-value';

describe('formatPerkValueUsdLabel', () => {
  it('formats whole dollars', () => {
    expect(formatPerkValueUsdLabel(9)).toBe('$9 USD value');
  });

  it('formats fractional dollars without trailing zeros', () => {
    expect(formatPerkValueUsdLabel(9.5)).toBe('$9.5 USD value');
  });
});

describe('perkValueUsdFromUsdcAmount', () => {
  it('rounds to two decimal places', () => {
    expect(perkValueUsdFromUsdcAmount(7.125)).toBe(7.13);
  });
});

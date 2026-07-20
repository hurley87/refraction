import { describe, it, expect } from 'vitest';
import {
  CLAIM_POINTS_MAX_FEE_STROOPS,
  CLAIM_POINTS_RESTORE_MAX_FEE_STROOPS,
  CLAIM_POINTS_TTL_EXTEND_LEDGERS,
  claimPointsFeeStroops,
  claimPointsInclusionFeeStroops,
  formatStroopsAsXlm,
} from '../claim-points-fee';

describe('claimPointsFeeStroops', () => {
  it('sums inclusion + resource fee under the 1 XLM cap', () => {
    expect(claimPointsFeeStroops(100_000, 250_000)).toBe(350_000);
  });

  it('caps at 1 XLM even when simulation returns ~20 XLM', () => {
    // Mirrors the failing claim: ~197M stroops resource fee
    expect(claimPointsFeeStroops(100_000, 197_013_747)).toBe(
      CLAIM_POINTS_MAX_FEE_STROOPS
    );
  });

  it('allows a higher cap for one-time archival restore', () => {
    expect(
      claimPointsFeeStroops(
        100_000,
        197_013_747,
        CLAIM_POINTS_RESTORE_MAX_FEE_STROOPS
      )
    ).toBe(197_113_747);
  });

  it('uses a small mainnet inclusion fee (0.01 XLM)', () => {
    expect(claimPointsInclusionFeeStroops(true)).toBe(100_000);
    expect(claimPointsInclusionFeeStroops(false)).toBe(100);
  });

  it('formats stroops as XLM', () => {
    expect(formatStroopsAsXlm(10_000_000)).toBe('1');
    expect(formatStroopsAsXlm(100_000)).toBe('0.01');
  });

  it('extends TTL by ~100k ledgers past LCL when rent inflates fees', () => {
    expect(CLAIM_POINTS_TTL_EXTEND_LEDGERS).toBe(100_000);
  });

  it('budgets 25 XLM for one-time WASM restore', () => {
    expect(CLAIM_POINTS_RESTORE_MAX_FEE_STROOPS).toBe(250_000_000);
  });
});

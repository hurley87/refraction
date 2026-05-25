import { describe, expect, it } from 'vitest';
import { computeSettlementRetryBackoffSeconds } from '@/lib/activation/settlement-orchestration';

describe('computeSettlementRetryBackoffSeconds', () => {
  it('matches IRL-60 schedule (30s doubling, 2h cap)', () => {
    expect(computeSettlementRetryBackoffSeconds(1)).toBe(30);
    expect(computeSettlementRetryBackoffSeconds(2)).toBe(60);
    expect(computeSettlementRetryBackoffSeconds(3)).toBe(120);
    expect(computeSettlementRetryBackoffSeconds(10)).toBe(7200);
    expect(computeSettlementRetryBackoffSeconds(0)).toBe(30);
  });
});

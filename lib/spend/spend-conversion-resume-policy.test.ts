import { describe, it, expect } from 'vitest';
import { spendConversionResumeInvokesWalletReadinessOrchestration } from '@/lib/spend/spend-conversion-resume-policy';

describe('spendConversionResumeInvokesWalletReadinessOrchestration (IRL-21)', () => {
  it('skips automatic resume readiness orchestration for stellar_usdc', () => {
    expect(
      spendConversionResumeInvokesWalletReadinessOrchestration('stellar_usdc')
    ).toBe(false);
  });

  it('keeps Base USDC resume behavior invoking readiness + funding', () => {
    expect(
      spendConversionResumeInvokesWalletReadinessOrchestration('base_usdc')
    ).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { spendConversionResumeInvokesWalletReadinessOrchestration } from '@/lib/spend/spend-conversion-resume-policy';

describe('spendConversionResumeInvokesWalletReadinessOrchestration (IRL-21)', () => {
  it('invokes resume readiness orchestration for stellar_usdc', () => {
    expect(
      spendConversionResumeInvokesWalletReadinessOrchestration('stellar_usdc')
    ).toBe(true);
  });

  it('invokes resume readiness orchestration for base_usdc', () => {
    expect(
      spendConversionResumeInvokesWalletReadinessOrchestration('base_usdc')
    ).toBe(true);
  });
});

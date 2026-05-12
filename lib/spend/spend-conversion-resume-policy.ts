import type { SpendRail } from '@/lib/types';

/**
 * Whether automatic conversion resume at `points_deducted` without `funding_tx_hash`
 * should invoke wallet readiness + funding orchestration. All rails opt in so a stuck
 * conversion (e.g. crash after point deduction) does not fall through to Base-only
 * hash confirmation for non-Base rails such as `stellar_usdc`.
 */
export function spendConversionResumeInvokesWalletReadinessOrchestration(
  spendRail: SpendRail
): boolean {
  void spendRail;
  return true;
}

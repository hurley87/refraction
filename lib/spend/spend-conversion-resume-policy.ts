import type { SpendRail } from '@/lib/types';

/**
 * Whether automatic conversion resume at `points_deducted` without `funding_tx_hash`
 * should invoke wallet readiness + funding orchestration. Stellar skips this path so
 * readiness only runs on the explicit conversion confirm entrypoint (IRL-21).
 */
export function spendConversionResumeInvokesWalletReadinessOrchestration(
  spendRail: SpendRail
): boolean {
  return spendRail !== 'stellar_usdc';
}

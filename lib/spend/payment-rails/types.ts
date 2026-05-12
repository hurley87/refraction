import type { SpendWalletReadinessStatus } from '@/lib/types';

/**
 * Re-export for rail-layer code that should stay aligned with persisted readiness rows
 * (`SpendWalletReadinessOperation.status` in `lib/types.ts`).
 */
export type { SpendWalletReadinessStatus };

/**
 * Funding operation lifecycle at the **rail orchestration layer** (not DB enum alignment;
 * see IRL-20 / conversion refactor for persistence).
 *
 * **confirmed** means on-chain (or network-appropriate) finality consistent with existing
 * treasury ledger confirmation semantics; verification lives in rail implementations.
 */
export type SpendRailFundingOperationStatus =
  | 'pending'
  | 'submitted'
  | 'confirmed'
  | 'failed'
  | 'needs_review';

/**
 * Payment operation lifecycle at the **rail orchestration layer** (not `spend_transactions.status`;
 * DB alignment is deferred).
 *
 * **confirmed** means on-chain (or network-appropriate) evidence consistent with spend payment
 * ledger confirmation semantics; verification lives in rail implementations.
 */
export type SpendRailPaymentOperationStatus =
  | 'prepared'
  | 'submitted'
  | 'confirmed'
  | 'failed'
  | 'needs_review';

export type SpendPaymentRailSessionContext = {
  spendSessionId: string;
  spendExperienceId?: string;
};

/**
 * Inputs for reconciliation passes (e.g. cron). IRL-15 defines shape only; behavior is no-op
 * until reconciliation is centralized on rails.
 */
export type SpendPaymentRailReconcileContext = {
  spendSessionId: string;
  /** ISO timestamp — rows older than this may be candidates for reconciliation. */
  olderThanIso?: string;
};

/** Terminal funding states for orchestration branching in new code. */
export function isTerminalSpendRailFundingStatus(
  status: SpendRailFundingOperationStatus
): boolean {
  return (
    status === 'confirmed' || status === 'failed' || status === 'needs_review'
  );
}

/** Terminal payment states for orchestration branching in new code. */
export function isTerminalSpendRailPaymentStatus(
  status: SpendRailPaymentOperationStatus
): boolean {
  return (
    status === 'confirmed' || status === 'failed' || status === 'needs_review'
  );
}

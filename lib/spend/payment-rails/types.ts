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
 * Payment operation lifecycle at the **rail orchestration layer** and on
 * `spend_payment_prepare_operations.status` (IRL-28).
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
  /**
   * Spend pilot conversion row used for funding idempotency (`fund_user:<id>`) and analytics.
   * Optional for payment-only rail calls.
   */
  pointConversionId?: string;
  /**
   * Deterministic Privy REST `reference_id` for treasury→user funding (conversion-scoped).
   * When set, Base USDC rail passes this to `submitTreasuryUsdcTransfer`.
   */
  fundingReferenceId?: string;
  /**
   * Base pilot: optional session fields used by the Base USDC rail (`embeddedEvmWalletAddress`
   * aligns with `SpendSession.wallet_address`; other rails ignore unset fields for now).
   */
  embeddedEvmWalletAddress?: string;
  /** When set, Base readiness requires a case-insensitive match to `embeddedEvmWalletAddress`. */
  privyNormalizedWalletAddressLower?: string;
  /**
   * Spend session owner (`spend_sessions.user_id`, Privy user id). Required for Stellar
   * wallet readiness orchestration (IRL-21).
   */
  sessionOwnerPrivyUserId?: string;
  /** Human-readable USDC amount for treasury funding and payment verification. */
  usdcAmount?: number;
  /** User-submitted canonical `0x` + 64 hex payment hash for `confirmPayment`. */
  paymentTxHash?: string;
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

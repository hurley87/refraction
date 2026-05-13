import type { SpendRail } from '@/lib/types';
import { explorerTxUrlForSpendLedger } from '@/lib/spend-ledger-explorer-url';
import type { SpendRailError } from '@/lib/spend/payment-rails/errors';
import type {
  SpendPaymentRailReconcileContext,
  SpendPaymentRailSessionContext,
  SpendRailFundingOperationStatus,
  SpendRailPaymentOperationStatus,
  SpendWalletReadinessStatus,
} from '@/lib/spend/payment-rails/types';
import type {
  SpendBaseUsdcPaymentVerificationSnapshotV1,
  SpendPaymentPrepareStoredActionV1,
  SpendStellarUsdcBackendSubmitPreparedActionV1,
  SpendStellarUsdcPaymentVerificationSnapshotV1,
} from '@/lib/spend-payment-prepare-types';

/** Successful `preparePayment` payload (Base USDC fills `baseUsdc`; other rails omit). */
export type SpendPaymentPrepareRailValue = {
  status: SpendRailPaymentOperationStatus;
  baseUsdc?: {
    preparedAction: SpendPaymentPrepareStoredActionV1;
    verificationSnapshot: SpendBaseUsdcPaymentVerificationSnapshotV1;
  };
  stellarUsdc?: {
    preparedAction: SpendStellarUsdcBackendSubmitPreparedActionV1;
    verificationSnapshot: SpendStellarUsdcPaymentVerificationSnapshotV1;
  };
};

/** `confirmPayment` rail outcome (Base is verify-only; Stellar may return `needs_review`). */
export type SpendPaymentConfirmRailValue = {
  status: SpendRailPaymentOperationStatus;
  /** Ledger reference when known (Stellar 64-hex hash; Base uses client hash in orchestration). */
  ledgerTxReference?: string | null;
  /** Ambiguous verification reason for `needs_review` (Stellar). */
  verifyFailureReason?: string | null;
};

export type SpendRailResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: SpendRailError };

/**
 * Orchestration surface for spend payment rails (Base user-signed flows vs Stellar
 * backend-controlled flows). Differences are expressed through method availability and
 * rail-private implementation types — not through a public custody field.
 *
 * Several methods are structural placeholders for IRL-14 / IRL-19 / IRL-20; IRL-15 wires
 * registry + typing + shared errors only. Call production money movement only through
 * existing library paths until those issues land.
 */
export interface SpendPaymentRail {
  readonly spendRail: SpendRail;

  /**
   * Treasury USDC (or rail asset) spendable balance when the rail can resolve it server-side.
   * `null` means unknown / not loaded at this boundary (not an error).
   */
  getTreasurySpendableBalance(): Promise<SpendRailResult<number | null>>;

  /**
   * Coarse wallet readiness orchestration (e.g. sponsored account + trustline). Base USDC
   * treats readiness as **completed** at this boundary because session wallets are verified EVM
   * up front. Stellar USDC runs hybrid sponsor + Privy-signed setup until ledger-confirmed (IRL-18).
   */
  runWalletReadinessOrchestration(
    ctx: SpendPaymentRailSessionContext
  ): Promise<SpendRailResult<{ status: SpendWalletReadinessStatus }>>;

  /**
   * Treasury → user funding at the rail operation layer. Real orchestration moves in IRL-14 /
   * conversion refactors; Base returns a neutral pending placeholder, Stellar is unsupported.
   */
  initiateUserFunding(ctx: SpendPaymentRailSessionContext): Promise<
    SpendRailResult<{
      status: SpendRailFundingOperationStatus;
      /** Ledger reference when known (`0x…` hash or `pending:<privyTransactionId>`). */
      txReference?: string | null;
    }>
  >;

  /**
   * Prepare a payment action (idempotent descriptor). Base returns wallet transaction data;
   * Stellar returns backend-submit metadata (IRL-24).
   */
  preparePayment(
    ctx: SpendPaymentRailSessionContext
  ): Promise<SpendRailResult<SpendPaymentPrepareRailValue>>;

  /**
   * Confirm on-chain payment evidence. Base USDC: user-submitted tx hash. Stellar USDC:
   * server submit only (IRL-24); orchestration verifies on Horizon after `submitted`.
   */
  confirmPayment(
    ctx: SpendPaymentRailSessionContext
  ): Promise<SpendRailResult<SpendPaymentConfirmRailValue>>;

  /** Canonical explorer URL for a ledger transaction reference, when known. */
  explorerUrlForLedgerTx(txReference: string | null | undefined): string | null;

  /**
   * Reconcile stale pending/submitted operations (cron). IRL-15: successful no-op on Base;
   * unsupported outcome on Stellar until reconciliation is rail-backed.
   */
  reconcilePendingOperations(
    ctx: SpendPaymentRailReconcileContext
  ): Promise<SpendRailResult<void>>;

  /**
   * Whether this rail accepts **user-submitted** on-chain payment hashes for confirmation
   * in the spend pilot API. Base USDC: supported. Stellar v1 (server-controlled): not supported.
   */
  assertUserSignedOnchainPaymentConfirmSupported(): SpendRailResult<void>;
}

export function okSpendRail<T>(value: T): SpendRailResult<T> {
  return { ok: true, value };
}

export function errSpendRail(error: SpendRailError): SpendRailResult<never> {
  return { ok: false, error };
}

/** Shared explorer helper so rails stay aligned with `lib/spend-ledger-explorer-url.ts`. */
export function spendPaymentRailExplorerUrl(
  spendRail: SpendRail,
  txReference: string | null | undefined
): string | null {
  return explorerTxUrlForSpendLedger(spendRail, txReference);
}

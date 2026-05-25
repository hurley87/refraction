import {
  getSponsoredSettlementBatchSize,
  listBaseActivationSettlementsForWorker,
  listStellarActivationSettlementsForWorker,
  promoteActivationSettlementRetryingToQueued,
} from '@/lib/db/activation-settlement-transactions';
import { runBaseSettlementWorkerBatch } from '@/lib/activation/base-settlement-worker';
import { runStellarSettlementWorkerBatch } from '@/lib/activation/settlement-worker-stellar';

/**
 * Backoff seconds after a failed attempt, keyed by `submission_attempt` on the settlement row
 * after the failure is recorded (IRL-60). Matches
 * `promote_activation_settlement_retrying_to_queued` in `database/irl-60-settlement-retry-budget.sql`.
 *
 * Eligibility for dequeue uses settlement `queued_at` (first enqueue) plus this delay; the 24h
 * window is enforced separately inside `record_activation_settlement_failure_atomic`.
 */
export function computeSettlementRetryBackoffSeconds(
  submissionAttempt: number
): number {
  const a = Math.max(0, Math.trunc(submissionAttempt) - 1);
  return Math.min(30 * 2 ** a, 7200);
}

export type SponsoredSettlementCronResult = {
  batchSize: number;
  promotedRetryingToQueued: number;
  candidateSettlements: { base: number; stellar: number };
  stellar: {
    processed: number;
    confirmed: number;
    failed: number;
    skipped: number;
    scheduledRetry: number;
  };
  base: {
    processed: number;
    confirmed: number;
    failed: number;
    skipped: number;
    scheduledRetry: number;
  };
};

/**
 * Promotes `retrying` rows whose backoff window has elapsed, then runs Base + Stellar workers
 * on `queued` / `submitted` candidates (IRL-60).
 */
export async function runSponsoredSettlementCronOrchestrated(): Promise<SponsoredSettlementCronResult> {
  const batchSize = getSponsoredSettlementBatchSize();
  const promotedRetryingToQueued =
    await promoteActivationSettlementRetryingToQueued();

  const [baseCandidates, stellarCandidates] = await Promise.all([
    listBaseActivationSettlementsForWorker(batchSize),
    listStellarActivationSettlementsForWorker(batchSize),
  ]);

  const [baseSummary, stellarSummary] = await Promise.all([
    runBaseSettlementWorkerBatch(baseCandidates),
    runStellarSettlementWorkerBatch(stellarCandidates),
  ]);

  return {
    batchSize,
    promotedRetryingToQueued,
    candidateSettlements: {
      base: baseCandidates.length,
      stellar: stellarCandidates.length,
    },
    stellar: stellarSummary,
    base: baseSummary,
  };
}

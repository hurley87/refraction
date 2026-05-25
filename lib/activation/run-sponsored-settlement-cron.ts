import {
  getSponsoredSettlementBatchSize,
  listStellarActivationSettlementsForWorker,
} from '@/lib/db/activation-settlement-transactions';
import { runStellarSettlementWorkerBatch } from '@/lib/activation/settlement-worker-stellar';

export type SponsoredSettlementCronResult = {
  batchSize: number;
  candidateSettlements: number;
  stellar: {
    processed: number;
    confirmed: number;
    failed: number;
    skipped: number;
  };
  base: {
    processed: 0;
    message: 'deferred_to_irl_56';
  };
};

/**
 * Shared sponsored-settlement cron (IRL-58: Stellar branch; Base deferred to IRL-56).
 */
export async function runSponsoredSettlementCron(): Promise<SponsoredSettlementCronResult> {
  const batchSize = getSponsoredSettlementBatchSize();
  const candidates = await listStellarActivationSettlementsForWorker(batchSize);
  const stellarSummary = await runStellarSettlementWorkerBatch(candidates);

  return {
    batchSize,
    candidateSettlements: candidates.length,
    stellar: stellarSummary,
    base: { processed: 0, message: 'deferred_to_irl_56' },
  };
}

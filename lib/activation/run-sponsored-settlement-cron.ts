import { runSponsoredSettlementCronOrchestrated } from '@/lib/activation/settlement-orchestration';
import type { SponsoredSettlementCronResult } from '@/lib/activation/settlement-orchestration';

export type { SponsoredSettlementCronResult };

/**
 * Shared sponsored-settlement cron (IRL-60): promote `retrying` → `queued`, then Base + Stellar workers.
 */
export async function runSponsoredSettlementCron(): Promise<SponsoredSettlementCronResult> {
  return runSponsoredSettlementCronOrchestrated();
}

import type { SpendSession, SpendSessionStatus } from '@/lib/types';
import {
  computeSpendRailReconcileOlderThanIso,
  readSpendRailReconcileEnvConfig,
  reconcileSpendRailPendingOperationsForSession,
} from '@/lib/spend/reconcile-spend-rail-pending-operations';

const TERMINAL_STATUSES: ReadonlySet<SpendSessionStatus> = new Set([
  'payment_complete',
  'failed',
  'expired',
]);

export function spendSessionStatusAllowsOpportunisticRailReconcile(
  status: SpendSessionStatus
): boolean {
  return !TERMINAL_STATUSES.has(status);
}

/**
 * One bounded reconciliation pass for GET session / GET receipt (IRL-25).
 *
 * Uses the same {@link computeSpendRailReconcileOlderThanIso} cutoff as
 * {@link runSpendRailReconciliationCron}. Terminal session rows are skipped here to
 * avoid pointless work; there is no cross-instance request throttle in v1 (no new DB
 * columns) — staleness and safe no-ops remain inside reconciliation helpers.
 */
export async function maybeReconcileSpendRailOnAuthorizedSessionRead(input: {
  spendSessionId: string;
  session: SpendSession;
  nowMs?: number;
}): Promise<void> {
  if (
    !spendSessionStatusAllowsOpportunisticRailReconcile(input.session.status)
  ) {
    return;
  }
  const cfg = readSpendRailReconcileEnvConfig();
  const nowMs = input.nowMs ?? Date.now();
  const olderThanIso = computeSpendRailReconcileOlderThanIso(nowMs, cfg);
  await reconcileSpendRailPendingOperationsForSession({
    spendSessionId: input.spendSessionId,
    olderThanIso,
  });
}

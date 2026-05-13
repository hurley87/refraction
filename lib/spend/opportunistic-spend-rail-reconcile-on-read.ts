import type { SpendSession, SpendSessionStatus } from '@/lib/types';
import {
  computeSpendRailReconcileOlderThanIso,
  readSpendRailReconcileAgeWindowEnv,
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
 * Same env age window as cron; terminal sessions skipped. v1 has no per-request
 * cross-instance throttle (no new DB columns).
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
  const cfg = readSpendRailReconcileAgeWindowEnv();
  const nowMs = input.nowMs ?? Date.now();
  const olderThanIso = computeSpendRailReconcileOlderThanIso(nowMs, cfg);
  try {
    await reconcileSpendRailPendingOperationsForSession({
      spendSessionId: input.spendSessionId,
      olderThanIso,
    });
  } catch (e) {
    console.error('opportunistic spend rail reconcile on read:', e);
  }
}

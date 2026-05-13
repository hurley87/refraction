import { listSpendSessionIdsForStaleConversionFundingReconcile } from '@/lib/db/spend-sessions';
import { listSpendSessionIdsForStalePaymentPrepareReconcile } from '@/lib/db/spend-payment-prepare';
import {
  getSpendWalletReadinessBySessionId,
  listSpendSessionIdsForStaleStellarWalletReadiness,
} from '@/lib/db/spend-wallet-readiness';
import {
  reconcileSpendConversionFundingBackground,
  getSpendContextOr404,
} from '@/lib/spend-conversion-confirm';
import { reconcileSubmittedSpendPaymentBackground } from '@/lib/spend-payment-confirm';
import { runStellarUsdcWalletReadinessOrchestration } from '@/lib/spend/stellar-wallet-readiness-orchestration';
import { isSpendRailOperational } from '@/lib/spend-rail-config';
import type { SpendRail } from '@/lib/types';
import {
  okSpendRail,
  type SpendRailResult,
} from '@/lib/spend/payment-rails/spend-payment-rail';
import type { SpendPaymentRailReconcileContext } from '@/lib/spend/payment-rails/types';

const DEFAULT_MIN_AGE_SECONDS = 60;
const DEFAULT_BACKOFF_SECONDS = 120;
const DEFAULT_BATCH_SIZE = 25;
const RECONCILE_DISTINCT_ID = 'spend_rail_reconcile';

export type SpendRailReconcileEnvConfig = {
  minAgeSeconds: number;
  backoffSeconds: number;
  batchSize: number;
};

export function readSpendRailReconcileEnvConfig(): SpendRailReconcileEnvConfig {
  const minAge = Number.parseInt(
    process.env.SPEND_RAIL_CRON_MIN_AGE_SECONDS ?? `${DEFAULT_MIN_AGE_SECONDS}`,
    10
  );
  const backoff = Number.parseInt(
    process.env.SPEND_RAIL_CRON_BACKOFF_SECONDS ?? `${DEFAULT_BACKOFF_SECONDS}`,
    10
  );
  const batch = Number.parseInt(
    process.env.SPEND_RAIL_CRON_BATCH_SIZE ?? `${DEFAULT_BATCH_SIZE}`,
    10
  );
  return {
    minAgeSeconds:
      Number.isFinite(minAge) && minAge >= 0 ? minAge : DEFAULT_MIN_AGE_SECONDS,
    backoffSeconds:
      Number.isFinite(backoff) && backoff >= 0
        ? backoff
        : DEFAULT_BACKOFF_SECONDS,
    batchSize:
      Number.isFinite(batch) && batch > 0
        ? Math.min(batch, 500)
        : DEFAULT_BATCH_SIZE,
  };
}

function reconcileOlderThanIso(
  nowMs: number,
  cfg: SpendRailReconcileEnvConfig
): string {
  const deltaMs = Math.max(cfg.minAgeSeconds, cfg.backoffSeconds) * 1000;
  return new Date(nowMs - deltaMs).toISOString();
}

async function collectReconcileCandidateSessionIds(input: {
  olderThanIso: string;
  batchSize: number;
}): Promise<string[]> {
  const perSource = Math.max(1, Math.ceil(input.batchSize / 3));
  const [readiness, funding, payment] = await Promise.all([
    listSpendSessionIdsForStaleStellarWalletReadiness({
      olderThanIso: input.olderThanIso,
      limit: perSource,
    }),
    listSpendSessionIdsForStaleConversionFundingReconcile({
      olderThanIso: input.olderThanIso,
      limit: perSource,
    }),
    listSpendSessionIdsForStalePaymentPrepareReconcile({
      olderThanIso: input.olderThanIso,
      limit: perSource,
    }),
  ]);

  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of [...readiness, ...funding, ...payment]) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= input.batchSize) break;
  }
  return out;
}

/**
 * Reconciles pending Stellar readiness, conversion funding confirmations, and
 * submitted payment verifications for a single spend session. Safe to call from
 * Vercel Cron, overlapping runs, and future read-path hooks (IRL-25).
 */
export async function reconcileSpendRailPendingOperationsForSession(input: {
  spendSessionId: string;
  olderThanIso?: string;
  /** When set, no-ops if the session snapshot rail differs. */
  spendRail?: SpendRail;
  distinctId?: string;
}): Promise<SpendRailResult<void>> {
  const ctx = await getSpendContextOr404(input.spendSessionId);
  if ('error' in ctx) {
    return okSpendRail(undefined);
  }

  const { session, spendExperience } = ctx;
  if (input.spendRail != null && session.spend_rail !== input.spendRail) {
    return okSpendRail(undefined);
  }

  if (!isSpendRailOperational(session.spend_rail)) {
    return okSpendRail(undefined);
  }

  const distinctId = input.distinctId ?? RECONCILE_DISTINCT_ID;

  if (session.spend_rail === 'stellar_usdc') {
    const readiness = await getSpendWalletReadinessBySessionId(session.id);
    if (
      readiness &&
      (readiness.status === 'pending' || readiness.status === 'needs_review')
    ) {
      if (
        input.olderThanIso != null &&
        Date.parse(readiness.updated_at) > Date.parse(input.olderThanIso)
      ) {
        return okSpendRail(undefined);
      }
      try {
        const outcome = await runStellarUsdcWalletReadinessOrchestration({
          readinessRow: readiness,
          spendSessionId: session.id,
          spendExperienceId: spendExperience.id,
          sessionOwnerPrivyUserId: session.user_id,
        });
        if (!outcome.ok) {
          console.warn('stellar readiness reconcile: orchestration error');
        }
      } catch (e) {
        console.error('stellar readiness reconcile:', e);
      }
    }
  }

  try {
    await reconcileSpendConversionFundingBackground({
      session,
      spendExperience,
      distinctId,
    });
  } catch (e) {
    console.error('conversion funding reconcile:', e);
  }

  try {
    await reconcileSubmittedSpendPaymentBackground({
      session,
      spendExperience,
      distinctId,
    });
  } catch (e) {
    console.error('payment reconcile:', e);
  }

  return okSpendRail(undefined);
}

export type SpendRailReconcileCronResult = {
  candidateSessions: number;
  processedSessions: number;
  olderThanIso: string;
  batchSize: number;
};

/**
 * Bounded batch reconciliation for cron: collects stale session ids then runs
 * {@link reconcileSpendRailPendingOperationsForSession} per id.
 */
export async function runSpendRailReconciliationCron(input?: {
  nowMs?: number;
  config?: SpendRailReconcileEnvConfig;
}): Promise<SpendRailReconcileCronResult> {
  const cfg = input?.config ?? readSpendRailReconcileEnvConfig();
  const nowMs = input?.nowMs ?? Date.now();
  const olderThanIso = reconcileOlderThanIso(nowMs, cfg);
  const ids = await collectReconcileCandidateSessionIds({
    olderThanIso,
    batchSize: cfg.batchSize,
  });

  let processed = 0;
  for (const spendSessionId of ids) {
    const res = await reconcileSpendRailPendingOperationsForSession({
      spendSessionId,
      olderThanIso,
      distinctId: RECONCILE_DISTINCT_ID,
    });
    if (res.ok) {
      processed += 1;
    }
  }

  return {
    candidateSessions: ids.length,
    processedSessions: processed,
    olderThanIso,
    batchSize: cfg.batchSize,
  };
}

/** Adapter for {@link SpendPaymentRailReconcileContext} call sites. */
export async function reconcileSpendRailPendingOperationsFromRailContext(
  ctx: SpendPaymentRailReconcileContext,
  spendRail: SpendRail
): Promise<SpendRailResult<void>> {
  return reconcileSpendRailPendingOperationsForSession({
    spendSessionId: ctx.spendSessionId,
    olderThanIso: ctx.olderThanIso,
    spendRail,
    distinctId: RECONCILE_DISTINCT_ID,
  });
}

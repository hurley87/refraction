import { supabase } from './client';
import {
  CONVERSION_COLS,
  SESSION_COLS,
  SPEND_TX_COLS,
  rowToConversion,
  rowToSession,
  rowToSpendTransaction,
  toNum,
} from './spend-ledger-rows';
import { normalizeSpendRail } from './spend-rail';
import { WALLET_READINESS_ADMIN_SESSION_JOIN_SELECT } from './spend-wallet-readiness';
import {
  explorerTxUrlForSpendLedger,
  spendLedgerNetworkLabel,
} from '@/lib/spend-ledger-explorer-url';
import type {
  PointConversion,
  PointConversionStatus,
  SpendRail,
  SpendSession,
  SpendTransaction,
} from '@/lib/types';

export type SpendPilotAdminTotals = {
  /** Distinct users with status `funded` conversion */
  usersConverted: number;
  totalUsdcDistributed: number;
  totalUsdcReceivedAtEventWallet: number;
  spendSessionsCount: number;
};

export async function getSpendPilotAdminTotals(
  spendExperienceId: string
): Promise<SpendPilotAdminTotals> {
  const [fundedAgg, confirmedPaymentsAgg, sessionsCountRes] = await Promise.all(
    [
      supabase
        .from('point_conversions')
        .select('user_id, usdc_amount')
        .eq('spend_experience_id', spendExperienceId)
        .eq('status', 'funded'),
      supabase
        .from('spend_transactions')
        .select('usdc_amount')
        .eq('spend_experience_id', spendExperienceId)
        .eq('status', 'confirmed'),
      supabase
        .from('spend_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('spend_experience_id', spendExperienceId),
    ]
  );

  if (fundedAgg.error) {
    console.error('getSpendPilotAdminTotals funded:', fundedAgg.error);
    throw new Error(fundedAgg.error.message || 'Failed to sum conversions');
  }
  if (confirmedPaymentsAgg.error) {
    console.error(
      'getSpendPilotAdminTotals payments:',
      confirmedPaymentsAgg.error
    );
    throw new Error(
      confirmedPaymentsAgg.error.message || 'Failed to sum payments'
    );
  }
  if (sessionsCountRes.error) {
    console.error('getSpendPilotAdminTotals sessions:', sessionsCountRes.error);
    throw new Error(
      sessionsCountRes.error.message || 'Failed to count sessions'
    );
  }

  const fundedRows = fundedAgg.data ?? [];
  const userIds = new Set(fundedRows.map((r) => String(r.user_id)));
  const totalUsdcDistributed = fundedRows.reduce<number>(
    (sum, r) => sum + toNum(r.usdc_amount),
    0
  );

  const paymentRows = confirmedPaymentsAgg.data ?? [];
  const totalUsdcReceivedAtEventWallet = paymentRows.reduce<number>(
    (sum, r) => sum + toNum(r.usdc_amount),
    0
  );

  return {
    usersConverted: userIds.size,
    totalUsdcDistributed,
    totalUsdcReceivedAtEventWallet,
    spendSessionsCount: sessionsCountRes.count ?? 0,
  };
}

const ACTIVITY_SESSION_LIMIT = 200;
const FAILED_LIMIT = 100;

export type SpendPilotSessionActivityRow = {
  session: SpendSession;
  conversion: PointConversion | null;
  payment: SpendTransaction | null;
};

export async function listSpendPilotActivityForExperience(
  spendExperienceId: string
): Promise<{
  sessions: SpendPilotSessionActivityRow[];
  failedConversions: PointConversion[];
  failedPayments: SpendTransaction[];
}> {
  const { data: sessionRows, error: sessErr } = await supabase
    .from('spend_sessions')
    .select(SESSION_COLS)
    .eq('spend_experience_id', spendExperienceId)
    .order('created_at', { ascending: false })
    .limit(ACTIVITY_SESSION_LIMIT);

  if (sessErr) {
    console.error('listSpendPilotActivityForExperience sessions:', sessErr);
    throw new Error(sessErr.message || 'Failed to load sessions');
  }

  const sessions = (sessionRows ?? []).map((row) =>
    rowToSession(row as Record<string, unknown>)
  );
  const sessionIds = sessions.map((s) => s.id);

  const conversionsBySession = new Map<string, PointConversion>();
  const paymentsBySession = new Map<string, SpendTransaction>();

  if (sessionIds.length > 0) {
    const [convRes, payRes] = await Promise.all([
      supabase
        .from('point_conversions')
        .select(CONVERSION_COLS)
        .eq('spend_experience_id', spendExperienceId)
        .in('spend_session_id', sessionIds),
      supabase
        .from('spend_transactions')
        .select(SPEND_TX_COLS)
        .eq('spend_experience_id', spendExperienceId)
        .in('spend_session_id', sessionIds),
    ]);

    if (convRes.error) {
      console.error('listSpendPilotActivityForExperience conv:', convRes.error);
      throw new Error(convRes.error.message || 'Failed to load conversions');
    }
    if (payRes.error) {
      console.error('listSpendPilotActivityForExperience pay:', payRes.error);
      throw new Error(payRes.error.message || 'Failed to load payments');
    }

    for (const row of convRes.data ?? []) {
      const c = rowToConversion(row as Record<string, unknown>);
      conversionsBySession.set(c.spend_session_id, c);
    }
    for (const row of payRes.data ?? []) {
      const p = rowToSpendTransaction(row as Record<string, unknown>);
      paymentsBySession.set(p.spend_session_id, p);
    }
  }

  const activitySessions: SpendPilotSessionActivityRow[] = sessions.map(
    (session) => ({
      session,
      conversion: conversionsBySession.get(session.id) ?? null,
      payment: paymentsBySession.get(session.id) ?? null,
    })
  );

  const [failedConvRes, failedPayRes] = await Promise.all([
    supabase
      .from('point_conversions')
      .select(CONVERSION_COLS)
      .eq('spend_experience_id', spendExperienceId)
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(FAILED_LIMIT),
    supabase
      .from('spend_transactions')
      .select(SPEND_TX_COLS)
      .eq('spend_experience_id', spendExperienceId)
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(FAILED_LIMIT),
  ]);

  if (failedConvRes.error) {
    console.error(
      'listSpendPilotActivityForExperience failed conv:',
      failedConvRes.error
    );
    throw new Error(
      failedConvRes.error.message || 'Failed to load failed conversions'
    );
  }
  if (failedPayRes.error) {
    console.error(
      'listSpendPilotActivityForExperience failed pay:',
      failedPayRes.error
    );
    throw new Error(
      failedPayRes.error.message || 'Failed to load failed payments'
    );
  }

  return {
    sessions: activitySessions,
    failedConversions: (failedConvRes.data ?? []).map((row) =>
      rowToConversion(row as Record<string, unknown>)
    ),
    failedPayments: (failedPayRes.data ?? []).map((row) =>
      rowToSpendTransaction(row as Record<string, unknown>)
    ),
  };
}

const RAIL_OPS_DETAIL_LIMIT = 150;

/** Non-terminal conversion rows surfaced to admin ops (IRL-26). */
const CONVERSION_IN_FLIGHT_STATUSES: PointConversionStatus[] = [
  'pending',
  'points_deducted',
  'funding_pending',
  'needs_review',
];

export type SpendPilotAdminRailOperationKind =
  | 'wallet_readiness'
  | 'conversion'
  | 'payment';

/**
 * Read-only admin row for rail / ledger work (no `internal_diagnostics` or other
 * server-only payloads). Age is derived client-side from `createdAt` (IRL-26).
 */
export type SpendPilotAdminRailVisibilityRow = {
  operationKind: SpendPilotAdminRailOperationKind;
  operationId: string;
  spendExperienceId: string;
  spendSessionId: string;
  userId: string;
  spendRail: SpendRail;
  networkLabel: string;
  usdcAmount: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  safeErrorSummary: string | null;
  txHash: string | null;
  explorerTxUrl: string | null;
};

export type SpendPilotAdminFundedUnpaidRow = {
  spendExperienceId: string;
  spendSessionId: string;
  userId: string;
  spendRail: SpendRail;
  networkLabel: string;
  usdcAmount: number;
  sessionStatus: SpendSession['status'] | null;
  conversion: {
    id: string;
    status: PointConversionStatus;
    createdAt: string;
    updatedAt: string;
    fundingTxHash: string | null;
    explorerTxUrl: string | null;
    safeErrorSummary: string | null;
  };
  payment: {
    id: string;
    status: SpendTransaction['status'];
    createdAt: string;
    updatedAt: string;
    paymentTxHash: string | null;
    explorerTxUrl: string | null;
    safeErrorSummary: string | null;
  } | null;
};

export type SpendPilotAdminRailOpsSummary = {
  walletReadiness: { pending: number; needsReview: number };
  conversions: {
    pending: number;
    pointsDeducted: number;
    fundingPending: number;
    needsReview: number;
    inFlightTotal: number;
  };
  spendTransactions: { pending: number; submitted: number };
  fundedUnpaidSessions: number;
};

export type SpendPilotAdminRailVisibility = {
  summary: SpendPilotAdminRailOpsSummary;
  walletReadiness: SpendPilotAdminRailVisibilityRow[];
  conversionsInFlight: SpendPilotAdminRailVisibilityRow[];
  spendTransactionsInFlight: SpendPilotAdminRailVisibilityRow[];
  fundedUnpaid: SpendPilotAdminFundedUnpaidRow[];
};

function adminLedgerExplorerUrl(
  spendRail: SpendRail,
  persistedUrl: string | null | undefined,
  txHash: string | null | undefined
): string | null {
  const persisted = persistedUrl?.trim();
  if (persisted) return persisted;
  return explorerTxUrlForSpendLedger(spendRail, txHash);
}

function safeConversionErrorSummary(c: PointConversion): string | null {
  const lf = c.conversion_last_failure;
  if (lf) {
    return `${lf.category}: ${lf.reason_snippet}`;
  }
  const fr = c.failed_reason?.trim();
  return fr || null;
}

function safePaymentErrorSummary(p: SpendTransaction): string | null {
  return p.failed_reason?.trim() || null;
}

function walletReadinessSafeError(
  category: string | null | undefined,
  code: string | null | undefined
): string | null {
  const parts = [category?.trim(), code?.trim()].filter(Boolean) as string[];
  return parts.length ? parts.join(' · ') : null;
}

async function countWalletReadinessForExperience(
  spendExperienceId: string,
  status: 'pending' | 'needs_review'
): Promise<number> {
  const { count, error } = await supabase
    .from('spend_wallet_readiness_operations')
    .select('id, spend_sessions!inner(spend_experience_id)', {
      count: 'exact',
      head: true,
    })
    .eq('spend_sessions.spend_experience_id', spendExperienceId)
    .eq('status', status);

  if (error) {
    console.error('countWalletReadinessForExperience:', error);
    throw new Error(error.message || 'Failed to count wallet readiness');
  }
  return count ?? 0;
}

async function countConversionsByStatus(
  spendExperienceId: string,
  status: PointConversionStatus
): Promise<number> {
  const { count, error } = await supabase
    .from('point_conversions')
    .select('id', { count: 'exact', head: true })
    .eq('spend_experience_id', spendExperienceId)
    .eq('status', status);

  if (error) {
    console.error('countConversionsByStatus:', error);
    throw new Error(error.message || 'Failed to count conversions');
  }
  return count ?? 0;
}

async function countSpendTxByStatus(
  spendExperienceId: string,
  status: SpendTransaction['status']
): Promise<number> {
  const { count, error } = await supabase
    .from('spend_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('spend_experience_id', spendExperienceId)
    .eq('status', status);

  if (error) {
    console.error('countSpendTxByStatus:', error);
    throw new Error(error.message || 'Failed to count spend transactions');
  }
  return count ?? 0;
}

function chunkIds<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * Paginates all `funded` conversions for an experience and keeps the newest
 * `updated_at` row per `spend_session_id` (handles duplicate rows if any).
 */
async function loadLatestFundedConversionBySession(
  spendExperienceId: string
): Promise<Map<string, PointConversion>> {
  const latestBySession = new Map<string, PointConversion>();
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('point_conversions')
      .select(CONVERSION_COLS)
      .eq('spend_experience_id', spendExperienceId)
      .eq('status', 'funded')
      .order('updated_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('loadLatestFundedConversionBySession:', error);
      throw new Error(error.message || 'Failed to load funded conversions');
    }
    const rows = data ?? [];
    if (rows.length === 0) break;

    for (const row of rows) {
      const c = rowToConversion(row as Record<string, unknown>);
      const prev = latestBySession.get(c.spend_session_id);
      if (!prev || prev.updated_at < c.updated_at) {
        latestBySession.set(c.spend_session_id, c);
      }
    }
    if (rows.length < pageSize) break;
  }
  return latestBySession;
}

/**
 * In-flight / needs_review wallet readiness, conversions, spend_transactions,
 * and funded-but-unpaid sessions for a single spend experience (IRL-26).
 */
export async function getSpendPilotAdminRailVisibility(
  spendExperienceId: string
): Promise<SpendPilotAdminRailVisibility> {
  const [
    wrPendingCount,
    wrNeedsReviewCount,
    convPendingCount,
    convPointsDeductedCount,
    convFundingPendingCount,
    convNeedsReviewCount,
    payPendingCount,
    paySubmittedCount,
  ] = await Promise.all([
    countWalletReadinessForExperience(spendExperienceId, 'pending'),
    countWalletReadinessForExperience(spendExperienceId, 'needs_review'),
    countConversionsByStatus(spendExperienceId, 'pending'),
    countConversionsByStatus(spendExperienceId, 'points_deducted'),
    countConversionsByStatus(spendExperienceId, 'funding_pending'),
    countConversionsByStatus(spendExperienceId, 'needs_review'),
    countSpendTxByStatus(spendExperienceId, 'pending'),
    countSpendTxByStatus(spendExperienceId, 'submitted'),
  ]);

  const conversionInFlightTotal =
    convPendingCount +
    convPointsDeductedCount +
    convFundingPendingCount +
    convNeedsReviewCount;

  const [wrListRes, convListRes, payListRes, latestFundedBySession] =
    await Promise.all([
      supabase
        .from('spend_wallet_readiness_operations')
        .select(WALLET_READINESS_ADMIN_SESSION_JOIN_SELECT)
        .eq('spend_sessions.spend_experience_id', spendExperienceId)
        .in('status', ['pending', 'needs_review'])
        .order('created_at', { ascending: true })
        .limit(RAIL_OPS_DETAIL_LIMIT),
      supabase
        .from('point_conversions')
        .select(CONVERSION_COLS)
        .eq('spend_experience_id', spendExperienceId)
        .in('status', CONVERSION_IN_FLIGHT_STATUSES)
        .order('created_at', { ascending: true })
        .limit(RAIL_OPS_DETAIL_LIMIT),
      supabase
        .from('spend_transactions')
        .select(SPEND_TX_COLS)
        .eq('spend_experience_id', spendExperienceId)
        .in('status', ['pending', 'submitted'])
        .order('created_at', { ascending: true })
        .limit(RAIL_OPS_DETAIL_LIMIT),
      loadLatestFundedConversionBySession(spendExperienceId),
    ]);

  if (wrListRes.error) {
    console.error('getSpendPilotAdminRailVisibility wr list:', wrListRes.error);
    throw new Error(
      wrListRes.error.message || 'Failed to load wallet readiness'
    );
  }
  if (convListRes.error) {
    console.error(
      'getSpendPilotAdminRailVisibility conv list:',
      convListRes.error
    );
    throw new Error(convListRes.error.message || 'Failed to load conversions');
  }
  if (payListRes.error) {
    console.error(
      'getSpendPilotAdminRailVisibility pay list:',
      payListRes.error
    );
    throw new Error(
      payListRes.error.message || 'Failed to load spend transactions'
    );
  }
  const walletReadinessRows: SpendPilotAdminRailVisibilityRow[] = (
    wrListRes.data ?? []
  ).map((raw) => {
    const row = raw as Record<string, unknown>;
    const nestedRaw = row.spend_sessions as
      | { spend_experience_id: string }
      | { spend_experience_id: string }[]
      | undefined;
    const nested = Array.isArray(nestedRaw) ? nestedRaw[0] : nestedRaw;
    const spendExperienceIdFromJoin = nested?.spend_experience_id
      ? String(nested.spend_experience_id)
      : spendExperienceId;
    const spendRail = normalizeSpendRail(row.spend_rail);
    return {
      operationKind: 'wallet_readiness' as const,
      operationId: String(row.id),
      spendExperienceId: spendExperienceIdFromJoin,
      spendSessionId: String(row.spend_session_id),
      userId: String(row.user_id),
      spendRail,
      networkLabel: spendLedgerNetworkLabel(spendRail),
      usdcAmount: null,
      status: String(row.status),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      safeErrorSummary: walletReadinessSafeError(
        row.sanitized_error_category as string | null,
        row.sanitized_error_code as string | null
      ),
      txHash: null,
      explorerTxUrl: null,
    };
  });

  const conversionsInFlight: SpendPilotAdminRailVisibilityRow[] = (
    convListRes.data ?? []
  ).map((r) => {
    const c = rowToConversion(r as Record<string, unknown>);
    return {
      operationKind: 'conversion' as const,
      operationId: c.id,
      spendExperienceId: c.spend_experience_id,
      spendSessionId: c.spend_session_id,
      userId: c.user_id,
      spendRail: c.spend_rail,
      networkLabel: c.network,
      usdcAmount: c.usdc_amount,
      status: c.status,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      safeErrorSummary: safeConversionErrorSummary(c),
      txHash: c.funding_tx_hash,
      explorerTxUrl: adminLedgerExplorerUrl(
        c.spend_rail,
        c.explorer_tx_url,
        c.funding_tx_hash
      ),
    };
  });

  const spendTransactionsInFlight: SpendPilotAdminRailVisibilityRow[] = (
    payListRes.data ?? []
  ).map((r) => {
    const p = rowToSpendTransaction(r as Record<string, unknown>);
    return {
      operationKind: 'payment' as const,
      operationId: p.id,
      spendExperienceId: p.spend_experience_id,
      spendSessionId: p.spend_session_id,
      userId: p.user_id,
      spendRail: p.spend_rail,
      networkLabel: p.network,
      usdcAmount: p.usdc_amount,
      status: p.status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      safeErrorSummary: safePaymentErrorSummary(p),
      txHash: p.payment_tx_hash,
      explorerTxUrl: adminLedgerExplorerUrl(
        p.spend_rail,
        p.explorer_tx_url,
        p.payment_tx_hash
      ),
    };
  });

  const fundedConversions = [...latestFundedBySession.values()];
  const fundedSessionIds = [...latestFundedBySession.keys()];

  const paymentsBySession = new Map<string, SpendTransaction>();
  for (const chunk of chunkIds(fundedSessionIds, 200)) {
    if (chunk.length === 0) continue;
    const { data, error } = await supabase
      .from('spend_transactions')
      .select(SPEND_TX_COLS)
      .eq('spend_experience_id', spendExperienceId)
      .in('spend_session_id', chunk);
    if (error) {
      console.error('getSpendPilotAdminRailVisibility funded payments:', error);
      throw new Error(error.message || 'Failed to load payment rows');
    }
    for (const row of data ?? []) {
      const p = rowToSpendTransaction(row as Record<string, unknown>);
      paymentsBySession.set(p.spend_session_id, p);
    }
  }

  const fundedUnpaidCandidates = fundedConversions.filter((c) => {
    const p = paymentsBySession.get(c.spend_session_id);
    return !p || p.status !== 'confirmed';
  });

  const fundedUnpaidSessionsCount = fundedUnpaidCandidates.length;

  const fundedUnpaidForList = [...fundedUnpaidCandidates]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, RAIL_OPS_DETAIL_LIMIT);
  const listSessionIds = [
    ...new Set(fundedUnpaidForList.map((c) => c.spend_session_id)),
  ];
  const sessionStatusById = new Map<string, SpendSession['status']>();
  for (const chunk of chunkIds(listSessionIds, 200)) {
    if (chunk.length === 0) continue;
    const { data, error } = await supabase
      .from('spend_sessions')
      .select('id, status')
      .eq('spend_experience_id', spendExperienceId)
      .in('id', chunk);
    if (error) {
      console.error('getSpendPilotAdminRailVisibility sessions:', error);
      throw new Error(error.message || 'Failed to load sessions');
    }
    for (const row of data ?? []) {
      const rec = row as { id: string; status: SpendSession['status'] };
      sessionStatusById.set(String(rec.id), rec.status);
    }
  }

  const fundedUnpaid: SpendPilotAdminFundedUnpaidRow[] =
    fundedUnpaidForList.map((c) => {
      const p = paymentsBySession.get(c.spend_session_id) ?? null;
      return {
        spendExperienceId: c.spend_experience_id,
        spendSessionId: c.spend_session_id,
        userId: c.user_id,
        spendRail: c.spend_rail,
        networkLabel: c.network,
        usdcAmount: c.usdc_amount,
        sessionStatus: sessionStatusById.get(c.spend_session_id) ?? null,
        conversion: {
          id: c.id,
          status: c.status,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
          fundingTxHash: c.funding_tx_hash,
          explorerTxUrl: adminLedgerExplorerUrl(
            c.spend_rail,
            c.explorer_tx_url,
            c.funding_tx_hash
          ),
          safeErrorSummary: safeConversionErrorSummary(c),
        },
        payment: p
          ? {
              id: p.id,
              status: p.status,
              createdAt: p.created_at,
              updatedAt: p.updated_at,
              paymentTxHash: p.payment_tx_hash,
              explorerTxUrl: adminLedgerExplorerUrl(
                p.spend_rail,
                p.explorer_tx_url,
                p.payment_tx_hash
              ),
              safeErrorSummary: safePaymentErrorSummary(p),
            }
          : null,
      };
    });

  return {
    summary: {
      walletReadiness: {
        pending: wrPendingCount,
        needsReview: wrNeedsReviewCount,
      },
      conversions: {
        pending: convPendingCount,
        pointsDeducted: convPointsDeductedCount,
        fundingPending: convFundingPendingCount,
        needsReview: convNeedsReviewCount,
        inFlightTotal: conversionInFlightTotal,
      },
      spendTransactions: {
        pending: payPendingCount,
        submitted: paySubmittedCount,
      },
      fundedUnpaidSessions: fundedUnpaidSessionsCount,
    },
    walletReadiness: walletReadinessRows,
    conversionsInFlight,
    spendTransactionsInFlight,
    fundedUnpaid,
  };
}

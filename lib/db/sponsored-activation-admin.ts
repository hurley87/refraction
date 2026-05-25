import { supabase } from '@/lib/db/client';
import type { SponsoredActivationRow } from '@/lib/db/sponsored-activations';
import { getSponsoredActivationByIdOrSlug } from '@/lib/db/sponsored-activations';
import type { ActivationRedemptionRow } from '@/lib/db/activation-redemptions';
import type { ActivationSettlementTransactionRow } from '@/lib/db/activation-settlement-transactions';
import type { ActivationRedemptionStatus } from '@/lib/schemas/activation-redemption';
import { formatSettlementExplorerTxUrl } from '@/lib/spend-rail-config';

/** Newest-first row caps for admin dashboard feeds (IRL-62). */
export const SPONSORED_ACTIVATION_ADMIN_FEED_CAP = 150;

const INFLIGHT_SETTLEMENT_STATUSES = [
  'not_started',
  'queued',
  'submitted',
  'retrying',
] as const;

const CONFIRMED_REDEMPTION_STATUSES: ActivationRedemptionStatus[] = [
  'redeemed',
  'settlement_pending',
  'settlement_confirmed',
  'settlement_failed',
];

const PENDING_SETTLEMENT_STATUSES = [
  'queued',
  'submitted',
  'retrying',
  'failed',
] as const;

function toNumber(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return NaN;
}

function sumNumeric(rows: { amount?: unknown }[], key: 'amount'): number {
  let t = 0;
  for (const r of rows) {
    const n = toNumber(r[key]);
    if (!Number.isNaN(n)) t += n;
  }
  return t;
}

function sumUsdcSnapshots(rows: { usdc_amount_snapshot?: unknown }[]): number {
  let t = 0;
  for (const r of rows) {
    const n = toNumber(r.usdc_amount_snapshot);
    if (!Number.isNaN(n) && n > 0) t += n;
  }
  return t;
}

/**
 * Matches `confirm_activation_purchase_atomic` reserved USDC math (IRL-60):
 * inflight settlements (`not_started|queued|submitted|retrying`) plus committed
 * redemptions (`purchase_confirmed|ready_to_redeem` with snapshot &gt; 0).
 */
export function computeReservedUsdcFromRaw(input: {
  inflightSettlementRows: { amount: unknown }[];
  committedRedemptionRows: { usdc_amount_snapshot: unknown }[];
}): number {
  return (
    sumNumeric(input.inflightSettlementRows, 'amount') +
    sumUsdcSnapshots(input.committedRedemptionRows)
  );
}

export function computeBudgetRemainingUsdc(input: {
  maxUsdcBudget: number | null;
  usdcSettledTotal: number;
  reservedUsdc: number;
}): number | null {
  if (input.maxUsdcBudget == null) return null;
  return input.maxUsdcBudget - input.usdcSettledTotal - input.reservedUsdc;
}

export function computeRedemptionsRemaining(input: {
  maxRedemptions: number | null;
  redemptionCountConfirmed: number;
}): number | null {
  if (input.maxRedemptions == null) return null;
  return Math.max(0, input.maxRedemptions - input.redemptionCountConfirmed);
}

export type SponsoredActivationAdminTiles = {
  checkInsVerified: number;
  redemptionsCreated: number;
  redemptionsConfirmed: number;
  usdcSettledTotal: number;
  reservedUsdc: number;
  budgetRemainingUsdc: number | null;
  redemptionsRemaining: number | null;
  settlementRail: SponsoredActivationRow['settlement_rail'];
};

export type SponsoredActivationConfirmedSettlementRow = {
  id: string;
  redemptionId: string;
  amount: number;
  txHash: string | null;
  confirmedAt: string | null;
  explorerTxUrl: string | null;
};

export type SponsoredActivationPendingSettlementRow = {
  id: string;
  redemptionId: string;
  redemptionStatus: ActivationRedemptionStatus;
  status: ActivationSettlementTransactionRow['status'];
  amount: number;
  txHash: string | null;
  queuedAt: string | null;
  submittedAt: string | null;
  lastErrorCode: string | null;
  submissionAttempt: number;
  /** True when manual admin retry RPC is expected to succeed (IRL-60). */
  canManualRetry: boolean;
};

export type SponsoredActivationAdminRedemptionRow = {
  id: string;
  userId: number;
  username: string | null;
  rewardDisplayName: string;
  pointsSpent: number | null;
  usdcAmountSnapshot: number | null;
  status: ActivationRedemptionStatus;
  createdAt: string;
  updatedAt: string;
  purchaseConfirmedAt: string | null;
  redeemedAt: string | null;
  settlement: {
    id: string;
    status: ActivationSettlementTransactionRow['status'];
    amount: number;
    txHash: string | null;
    explorerTxUrl: string | null;
    queuedAt: string | null;
    submittedAt: string | null;
    confirmedAt: string | null;
    lastErrorCode: string | null;
  } | null;
  eligibility: {
    source: string;
    sourceRefId: string | null;
    occurredAt: string;
  };
};

export type SponsoredActivationAdminDashboardPayload = {
  tiles: SponsoredActivationAdminTiles;
  confirmedSettlements: SponsoredActivationConfirmedSettlementRow[];
  pendingSettlements: SponsoredActivationPendingSettlementRow[];
  redemptions: SponsoredActivationAdminRedemptionRow[];
};

async function countEligibilityEvents(activationId: string): Promise<number> {
  const { count, error } = await supabase
    .from('activation_eligibility_event')
    .select('id', { count: 'exact', head: true })
    .eq('activation_id', activationId);
  if (error) {
    console.error('countEligibilityEvents:', error);
    throw new Error(error.message || 'Failed to count eligibility events');
  }
  return count ?? 0;
}

async function countRedemptionsCreated(activationId: string): Promise<number> {
  const { count, error } = await supabase
    .from('activation_redemption')
    .select('id', { count: 'exact', head: true })
    .eq('activation_id', activationId)
    .not('status', 'in', '(eligible,available)');
  if (error) {
    console.error('countRedemptionsCreated:', error);
    throw new Error(error.message || 'Failed to count created redemptions');
  }
  return count ?? 0;
}

async function countRedemptionsConfirmed(
  activationId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('activation_redemption')
    .select('id', { count: 'exact', head: true })
    .eq('activation_id', activationId)
    .in('status', CONFIRMED_REDEMPTION_STATUSES);
  if (error) {
    console.error('countRedemptionsConfirmed:', error);
    throw new Error(error.message || 'Failed to count confirmed redemptions');
  }
  return count ?? 0;
}

async function fetchInflightSettlementAmountRows(
  activationId: string
): Promise<{ amount: unknown }[]> {
  const { data, error } = await supabase
    .from('activation_settlement_transaction')
    .select('amount')
    .eq('activation_id', activationId)
    .in('status', [...INFLIGHT_SETTLEMENT_STATUSES]);
  if (error) {
    console.error('fetchInflightSettlementAmountRows:', error);
    throw new Error(error.message || 'Failed to load inflight settlements');
  }
  return data ?? [];
}

async function fetchCommittedRedemptionSnapshotRows(
  activationId: string
): Promise<{ usdc_amount_snapshot: unknown }[]> {
  const { data, error } = await supabase
    .from('activation_redemption')
    .select('usdc_amount_snapshot')
    .eq('activation_id', activationId)
    .in('status', ['purchase_confirmed', 'ready_to_redeem'])
    .not('usdc_amount_snapshot', 'is', null)
    .gt('usdc_amount_snapshot', 0);
  if (error) {
    console.error('fetchCommittedRedemptionSnapshotRows:', error);
    throw new Error(
      error.message || 'Failed to load committed redemption USDC'
    );
  }
  return data ?? [];
}

async function listConfirmedSettlements(
  activationId: string,
  rail: SponsoredActivationRow['settlement_rail']
): Promise<SponsoredActivationConfirmedSettlementRow[]> {
  const { data, error } = await supabase
    .from('activation_settlement_transaction')
    .select('id, redemption_id, amount, tx_hash, confirmed_at, status')
    .eq('activation_id', activationId)
    .eq('status', 'confirmed')
    .order('confirmed_at', { ascending: false, nullsFirst: false })
    .limit(SPONSORED_ACTIVATION_ADMIN_FEED_CAP);
  if (error) {
    console.error('listConfirmedSettlements:', error);
    throw new Error(error.message || 'Failed to list confirmed settlements');
  }
  const rows = data ?? [];
  return rows.map((r) => {
    const txHash = r.tx_hash == null ? null : String(r.tx_hash);
    return {
      id: String(r.id),
      redemptionId: String(r.redemption_id),
      amount: toNumber(r.amount),
      txHash,
      confirmedAt: r.confirmed_at == null ? null : String(r.confirmed_at),
      explorerTxUrl: formatSettlementExplorerTxUrl(rail, txHash),
    };
  });
}

async function listPendingSettlements(
  activationId: string
): Promise<ActivationSettlementTransactionRow[]> {
  const { data, error } = await supabase
    .from('activation_settlement_transaction')
    .select('*')
    .eq('activation_id', activationId)
    .in('status', [...PENDING_SETTLEMENT_STATUSES])
    .order('id', { ascending: false })
    .limit(SPONSORED_ACTIVATION_ADMIN_FEED_CAP);
  if (error) {
    console.error('listPendingSettlements:', error);
    throw new Error(error.message || 'Failed to list pending settlements');
  }
  return (data ?? []).map((r) => ({
    id: String(r.id),
    redemption_id: String(r.redemption_id),
    activation_id: String(r.activation_id),
    settlement_rail:
      r.settlement_rail as SponsoredActivationRow['settlement_rail'],
    status: r.status as ActivationSettlementTransactionRow['status'],
    amount: toNumber(r.amount),
    from_wallet_address: String(r.from_wallet_address),
    to_wallet_address: String(r.to_wallet_address),
    tx_hash: r.tx_hash == null ? null : String(r.tx_hash),
    submission_attempt: Number(r.submission_attempt) || 0,
    last_error_code:
      r.last_error_code == null ? null : String(r.last_error_code),
    queued_at: r.queued_at == null ? null : String(r.queued_at),
    submitted_at: r.submitted_at == null ? null : String(r.submitted_at),
    confirmed_at: r.confirmed_at == null ? null : String(r.confirmed_at),
    privy_transaction_id:
      r.privy_transaction_id == null ? null : String(r.privy_transaction_id),
  }));
}

async function listLatestRedemptions(
  activationId: string
): Promise<ActivationRedemptionRow[]> {
  const { data, error } = await supabase
    .from('activation_redemption')
    .select('*')
    .eq('activation_id', activationId)
    .order('created_at', { ascending: false })
    .limit(SPONSORED_ACTIVATION_ADMIN_FEED_CAP);
  if (error) {
    console.error('listLatestRedemptions:', error);
    throw new Error(error.message || 'Failed to list redemptions');
  }
  return (data ?? []).map((r) => ({
    id: String(r.id),
    activation_id: String(r.activation_id),
    reward_item_id: String(r.reward_item_id),
    user_id: Number(r.user_id),
    eligibility_event_id: String(r.eligibility_event_id),
    status: r.status as ActivationRedemptionStatus,
    idempotency_key: String(r.idempotency_key),
    points_spent:
      r.points_spent === null || r.points_spent === undefined
        ? null
        : Number(r.points_spent),
    usdc_amount_snapshot:
      r.usdc_amount_snapshot === null || r.usdc_amount_snapshot === undefined
        ? null
        : toNumber(r.usdc_amount_snapshot),
    purchase_confirmed_at:
      r.purchase_confirmed_at == null ? null : String(r.purchase_confirmed_at),
    redeemed_at: r.redeemed_at == null ? null : String(r.redeemed_at),
    cancelled_reason:
      r.cancelled_reason == null ? null : String(r.cancelled_reason),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  }));
}

type PlayerMini = { id: number; username: string | null };
type RewardMini = { id: string; name: string };
type EligibilityMini = {
  id: string;
  source: string;
  source_ref_id: string | null;
  occurred_at: string;
};

async function fetchPlayersByIds(
  ids: number[]
): Promise<Map<number, PlayerMini>> {
  const uniq = [...new Set(ids)].filter((n) => Number.isFinite(n));
  const map = new Map<number, PlayerMini>();
  if (uniq.length === 0) return map;
  const { data, error } = await supabase
    .from('players')
    .select('id, username')
    .in('id', uniq);
  if (error) {
    console.error('fetchPlayersByIds:', error);
    throw new Error(error.message || 'Failed to load players');
  }
  for (const row of data ?? []) {
    map.set(Number(row.id), {
      id: Number(row.id),
      username: row.username == null ? null : String(row.username),
    });
  }
  return map;
}

async function fetchRewardItemsByIds(
  ids: string[]
): Promise<Map<string, RewardMini>> {
  const uniq = [...new Set(ids)].filter(Boolean);
  const map = new Map<string, RewardMini>();
  if (uniq.length === 0) return map;
  const { data, error } = await supabase
    .from('activation_reward_item')
    .select('id, name')
    .in('id', uniq);
  if (error) {
    console.error('fetchRewardItemsByIds:', error);
    throw new Error(error.message || 'Failed to load reward items');
  }
  for (const row of data ?? []) {
    map.set(String(row.id), {
      id: String(row.id),
      name: String(row.name),
    });
  }
  return map;
}

async function fetchEligibilityEventsByIds(
  ids: string[]
): Promise<Map<string, EligibilityMini>> {
  const uniq = [...new Set(ids)].filter(Boolean);
  const map = new Map<string, EligibilityMini>();
  if (uniq.length === 0) return map;
  const { data, error } = await supabase
    .from('activation_eligibility_event')
    .select('id, source, source_ref_id, occurred_at')
    .in('id', uniq);
  if (error) {
    console.error('fetchEligibilityEventsByIds:', error);
    throw new Error(error.message || 'Failed to load eligibility events');
  }
  for (const row of data ?? []) {
    map.set(String(row.id), {
      id: String(row.id),
      source: String(row.source),
      source_ref_id:
        row.source_ref_id == null ? null : String(row.source_ref_id),
      occurred_at: String(row.occurred_at),
    });
  }
  return map;
}

async function fetchSettlementsByRedemptionIds(
  redemptionIds: string[]
): Promise<Map<string, ActivationSettlementTransactionRow>> {
  const uniq = [...new Set(redemptionIds)].filter(Boolean);
  const map = new Map<string, ActivationSettlementTransactionRow>();
  if (uniq.length === 0) return map;
  const { data, error } = await supabase
    .from('activation_settlement_transaction')
    .select('*')
    .in('redemption_id', uniq);
  if (error) {
    console.error('fetchSettlementsByRedemptionIds:', error);
    throw new Error(error.message || 'Failed to load settlements');
  }
  for (const r of data ?? []) {
    const row: ActivationSettlementTransactionRow = {
      id: String(r.id),
      redemption_id: String(r.redemption_id),
      activation_id: String(r.activation_id),
      settlement_rail:
        r.settlement_rail as SponsoredActivationRow['settlement_rail'],
      status: r.status as ActivationSettlementTransactionRow['status'],
      amount: toNumber(r.amount),
      from_wallet_address: String(r.from_wallet_address),
      to_wallet_address: String(r.to_wallet_address),
      tx_hash: r.tx_hash == null ? null : String(r.tx_hash),
      submission_attempt: Number(r.submission_attempt) || 0,
      last_error_code:
        r.last_error_code == null ? null : String(r.last_error_code),
      queued_at: r.queued_at == null ? null : String(r.queued_at),
      submitted_at: r.submitted_at == null ? null : String(r.submitted_at),
      confirmed_at: r.confirmed_at == null ? null : String(r.confirmed_at),
      privy_transaction_id:
        r.privy_transaction_id == null ? null : String(r.privy_transaction_id),
    };
    map.set(row.redemption_id, row);
  }
  return map;
}

/**
 * Aggregated read model for the admin sponsored activation ops dashboard (IRL-62).
 * Returns `null` when the activation id/slug does not exist.
 */
export async function loadSponsoredActivationAdminDashboard(
  activationIdOrSlug: string
): Promise<
  | (SponsoredActivationAdminDashboardPayload & {
      activation: SponsoredActivationRow;
    })
  | null
> {
  const activation = await getSponsoredActivationByIdOrSlug(
    activationIdOrSlug.trim()
  );
  if (!activation) return null;

  const id = activation.id;
  const rail = activation.settlement_rail;

  const [
    checkInsVerified,
    redemptionsCreated,
    redemptionsConfirmed,
    inflightRows,
    committedRows,
    confirmedSettlements,
    pendingSettlementRows,
    redemptionRows,
  ] = await Promise.all([
    countEligibilityEvents(id),
    countRedemptionsCreated(id),
    countRedemptionsConfirmed(id),
    fetchInflightSettlementAmountRows(id),
    fetchCommittedRedemptionSnapshotRows(id),
    listConfirmedSettlements(id, rail),
    listPendingSettlements(id),
    listLatestRedemptions(id),
  ]);

  const reservedUsdc = computeReservedUsdcFromRaw({
    inflightSettlementRows: inflightRows,
    committedRedemptionRows: committedRows,
  });

  const budgetRemainingUsdc = computeBudgetRemainingUsdc({
    maxUsdcBudget: activation.max_usdc_budget,
    usdcSettledTotal: activation.usdc_settled_total,
    reservedUsdc,
  });

  const redemptionsRemaining = computeRedemptionsRemaining({
    maxRedemptions: activation.max_redemptions,
    redemptionCountConfirmed: activation.redemption_count_confirmed,
  });

  const tiles: SponsoredActivationAdminTiles = {
    checkInsVerified,
    redemptionsCreated,
    redemptionsConfirmed,
    usdcSettledTotal: activation.usdc_settled_total,
    reservedUsdc,
    budgetRemainingUsdc,
    redemptionsRemaining,
    settlementRail: rail,
  };

  const redemptionStatusById = new Map(
    redemptionRows.map((r) => [r.id, r.status])
  );
  const extraRedemptionIds = pendingSettlementRows
    .map((s) => s.redemption_id)
    .filter((rid) => !redemptionStatusById.has(rid));
  let mergedStatusMap = redemptionStatusById;
  if (extraRedemptionIds.length > 0) {
    const { data, error } = await supabase
      .from('activation_redemption')
      .select('id, status')
      .in('id', [...new Set(extraRedemptionIds)]);
    if (error) {
      console.error('load pending redemption statuses:', error);
      throw new Error(error.message || 'Failed to load redemption statuses');
    }
    mergedStatusMap = new Map(mergedStatusMap);
    for (const row of data ?? []) {
      mergedStatusMap.set(
        String(row.id),
        row.status as ActivationRedemptionStatus
      );
    }
  }

  const pendingSettlements: SponsoredActivationPendingSettlementRow[] =
    pendingSettlementRows.map((s) => {
      const redemptionStatus =
        mergedStatusMap.get(s.redemption_id) ?? 'eligible';
      const canManualRetry =
        s.status === 'failed' && redemptionStatus === 'settlement_failed';
      return {
        id: s.id,
        redemptionId: s.redemption_id,
        redemptionStatus,
        status: s.status,
        amount: s.amount,
        txHash: s.tx_hash,
        queuedAt: s.queued_at,
        submittedAt: s.submitted_at,
        lastErrorCode: s.last_error_code,
        submissionAttempt: s.submission_attempt,
        canManualRetry,
      };
    });

  const userIds = redemptionRows.map((r) => r.user_id);
  const rewardIds = redemptionRows.map((r) => r.reward_item_id);
  const eligIds = redemptionRows.map((r) => r.eligibility_event_id);
  const redIds = redemptionRows.map((r) => r.id);

  const [playersById, rewardsById, eligById, settlementByRedemptionId] =
    await Promise.all([
      fetchPlayersByIds(userIds),
      fetchRewardItemsByIds(rewardIds),
      fetchEligibilityEventsByIds(eligIds),
      fetchSettlementsByRedemptionIds(redIds),
    ]);

  const redemptions: SponsoredActivationAdminRedemptionRow[] =
    redemptionRows.map((r) => {
      const player = playersById.get(r.user_id);
      const reward = rewardsById.get(r.reward_item_id);
      const elig = eligById.get(r.eligibility_event_id);
      const st = settlementByRedemptionId.get(r.id);
      const txHash = st?.tx_hash ?? null;
      return {
        id: r.id,
        userId: r.user_id,
        username: player?.username ?? null,
        rewardDisplayName: reward?.name ?? '(unknown reward)',
        pointsSpent: r.points_spent,
        usdcAmountSnapshot: r.usdc_amount_snapshot,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        purchaseConfirmedAt: r.purchase_confirmed_at,
        redeemedAt: r.redeemed_at,
        settlement: st
          ? {
              id: st.id,
              status: st.status,
              amount: st.amount,
              txHash: st.tx_hash,
              explorerTxUrl: formatSettlementExplorerTxUrl(rail, txHash),
              queuedAt: st.queued_at,
              submittedAt: st.submitted_at,
              confirmedAt: st.confirmed_at,
              lastErrorCode: st.last_error_code,
            }
          : null,
        eligibility: elig
          ? {
              source: elig.source,
              sourceRefId: elig.source_ref_id,
              occurredAt: elig.occurred_at,
            }
          : {
              source: 'unknown',
              sourceRefId: null,
              occurredAt: r.created_at,
            },
      };
    });

  return {
    activation,
    tiles,
    confirmedSettlements,
    pendingSettlements,
    redemptions,
  };
}

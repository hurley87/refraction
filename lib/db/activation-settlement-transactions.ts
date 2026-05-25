import { supabase } from '@/lib/db/client';
import type { ActivationSettlementStatus } from '@/lib/schemas/activation-settlement';
import type { SettlementRail } from '@/lib/db/sponsored-activations';

const TABLE = 'activation_settlement_transaction';

export type ActivationSettlementTransactionRow = {
  id: string;
  redemption_id: string;
  activation_id: string;
  settlement_rail: SettlementRail;
  status: ActivationSettlementStatus;
  amount: number;
  from_wallet_address: string;
  to_wallet_address: string;
  tx_hash: string | null;
  submission_attempt: number;
  last_error_code: string | null;
  queued_at: string | null;
  submitted_at: string | null;
  confirmed_at: string | null;
  privy_transaction_id: string | null;
};

function toNumber(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return NaN;
}

function toInt(value: unknown): number {
  const n = toNumber(value);
  return Number.isNaN(n) ? 0 : Math.trunc(n);
}

function normalizeRow(
  row: Record<string, unknown>
): ActivationSettlementTransactionRow {
  return {
    id: String(row.id),
    redemption_id: String(row.redemption_id),
    activation_id: String(row.activation_id),
    settlement_rail: row.settlement_rail as SettlementRail,
    status: row.status as ActivationSettlementStatus,
    amount: toNumber(row.amount),
    from_wallet_address: String(row.from_wallet_address),
    to_wallet_address: String(row.to_wallet_address),
    tx_hash: row.tx_hash == null ? null : String(row.tx_hash),
    submission_attempt: toInt(row.submission_attempt),
    last_error_code:
      row.last_error_code == null ? null : String(row.last_error_code),
    queued_at: row.queued_at == null ? null : String(row.queued_at),
    submitted_at: row.submitted_at == null ? null : String(row.submitted_at),
    confirmed_at: row.confirmed_at == null ? null : String(row.confirmed_at),
    privy_transaction_id:
      row.privy_transaction_id == null
        ? null
        : String(row.privy_transaction_id),
  };
}

export async function getActivationSettlementTransactionByRedemptionId(
  redemptionId: string
): Promise<ActivationSettlementTransactionRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('redemption_id', redemptionId)
    .maybeSingle();

  if (error) {
    console.error('getActivationSettlementTransactionByRedemptionId:', error);
    throw new Error(error.message || 'Failed to load settlement transaction');
  }
  if (!data) return null;
  return normalizeRow(data as Record<string, unknown>);
}

export async function getActivationSettlementTransactionById(
  settlementId: string
): Promise<ActivationSettlementTransactionRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', settlementId)
    .maybeSingle();

  if (error) {
    console.error('getActivationSettlementTransactionById:', error);
    throw new Error(error.message || 'Failed to load settlement transaction');
  }
  if (!data) return null;
  return normalizeRow(data as Record<string, unknown>);
}

export type ActivationSettlementTransactionPatch = {
  status?: ActivationSettlementStatus;
  tx_hash?: string | null;
  privy_transaction_id?: string | null;
  last_error_code?: string | null;
  queued_at?: string | null;
  submitted_at?: string | null;
  confirmed_at?: string | null;
  submission_attempt?: number;
};

/**
 * Updates a settlement row by id (no status guard). Prefer
 * {@link updateActivationSettlementIfStatus} when moving `queued` → `submitted`
 * so concurrent workers do not double-apply patches.
 */
export async function updateActivationSettlementTransaction(
  settlementId: string,
  patch: ActivationSettlementTransactionPatch
): Promise<ActivationSettlementTransactionRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', settlementId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('updateActivationSettlementTransaction:', error);
    throw new Error(error.message || 'Failed to update settlement transaction');
  }
  if (!data) return null;
  return normalizeRow(data as Record<string, unknown>);
}

/**
 * Conditional update: only rows whose `status` is in `ifStatusIn` are updated.
 * Returns the updated row, or null when no row matched (e.g. another worker moved status).
 */
export async function updateActivationSettlementIfStatus(input: {
  settlementId: string;
  ifStatusIn: ActivationSettlementStatus[];
  patch: ActivationSettlementTransactionPatch;
}): Promise<ActivationSettlementTransactionRow | null> {
  let q = supabase.from(TABLE).update(input.patch).eq('id', input.settlementId);

  if (input.ifStatusIn.length === 1) {
    q = q.eq('status', input.ifStatusIn[0]!);
  } else {
    q = q.in('status', input.ifStatusIn);
  }

  const { data, error } = await q.select('*').maybeSingle();

  if (error) {
    console.error('updateActivationSettlementIfStatus:', error);
    throw new Error(
      error.message || 'Failed to conditionally update settlement transaction'
    );
  }
  if (!data) return null;
  return normalizeRow(data as Record<string, unknown>);
}

const MAX_SETTLEMENT_BATCH = 500;

function parseBatchSizeEnv(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(raw ?? `${fallback}`, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, MAX_SETTLEMENT_BATCH);
}

/** Env-driven batch size for sponsored settlement cron (IRL-58). */
export function getSponsoredSettlementBatchSize(): number {
  return parseBatchSizeEnv(process.env.SPONSORED_SETTLEMENT_BATCH_SIZE, 25);
}

/**
 * Stellar settlements eligible for worker: `queued` (submit) or `submitted` with tx_hash (poll only).
 */
export async function listStellarActivationSettlementsForWorker(
  limit: number
): Promise<ActivationSettlementTransactionRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('settlement_rail', 'stellar')
    .in('status', ['queued', 'submitted'])
    .order('queued_at', { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error('listStellarActivationSettlementsForWorker:', error);
    throw new Error(error.message || 'Failed to list settlement transactions');
  }
  return (data ?? []).map((r) => normalizeRow(r as Record<string, unknown>));
}

/**
 * Base settlements eligible for worker dequeue (IRL-56 library; cron wiring in IRL-60).
 */
export async function listBaseActivationSettlementsForWorker(
  limit: number
): Promise<ActivationSettlementTransactionRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('settlement_rail', 'base')
    .in('status', ['queued', 'submitted'])
    .order('queued_at', { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error('listBaseActivationSettlementsForWorker:', error);
    throw new Error(error.message || 'Failed to list settlement transactions');
  }
  return (data ?? []).map((r) => normalizeRow(r as Record<string, unknown>));
}

export async function markActivationSettlementSubmitted(input: {
  settlementId: string;
  txHash: string;
}): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: 'submitted',
      tx_hash: input.txHash.trim(),
      submitted_at: new Date().toISOString(),
      submission_attempt: 1,
    })
    .eq('id', input.settlementId)
    .eq('status', 'queued')
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('markActivationSettlementSubmitted:', error);
    throw new Error(error.message || 'Failed to mark settlement submitted');
  }
  return data != null;
}

export type ConfirmActivationSettlementRpcOutcome =
  | 'confirmed'
  | 'already_confirmed';

export async function confirmActivationSettlementAtomic(input: {
  settlementId: string;
  txHash: string;
}): Promise<ConfirmActivationSettlementRpcOutcome> {
  const { data, error } = await supabase.rpc(
    'confirm_activation_settlement_atomic',
    {
      p_settlement_id: input.settlementId,
      p_tx_hash: input.txHash,
    }
  );

  if (error) {
    throw new Error(
      error.message || 'confirm_activation_settlement_atomic failed'
    );
  }

  const outcome = typeof data === 'string' ? data : String(data ?? '');
  if (outcome === 'already_confirmed') return 'already_confirmed';
  if (outcome === 'confirmed') return 'confirmed';
  throw new Error(
    'Unexpected RPC response from confirm_activation_settlement_atomic'
  );
}

export type FailActivationSettlementRpcOutcome =
  | 'failed'
  | 'already_confirmed'
  | 'already_failed';

export async function failActivationSettlementAtomic(input: {
  settlementId: string;
  lastErrorCode: string;
}): Promise<FailActivationSettlementRpcOutcome> {
  const { data, error } = await supabase.rpc(
    'fail_activation_settlement_atomic',
    {
      p_settlement_id: input.settlementId,
      p_last_error_code: input.lastErrorCode,
    }
  );

  if (error) {
    throw new Error(
      error.message || 'fail_activation_settlement_atomic failed'
    );
  }

  const outcome = typeof data === 'string' ? data : String(data ?? '');
  if (outcome === 'already_confirmed') return 'already_confirmed';
  if (outcome === 'already_failed') return 'already_failed';
  if (outcome === 'failed') return 'failed';
  throw new Error(
    'Unexpected RPC response from fail_activation_settlement_atomic'
  );
}

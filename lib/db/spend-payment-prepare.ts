import { supabase } from './client';
import { normalizeSpendRail } from './spend-rail';
import type {
  SpendPaymentOperationClientSummary,
  SpendPaymentPrepareOperation,
  SpendPaymentPrepareOperationStatus,
  SpendRail,
} from '@/lib/types';

export const SPEND_PAYMENT_PREPARE_COLS = `
  id,
  spend_session_id,
  user_id,
  spend_rail,
  status,
  prepared_action,
  verification_snapshot,
  idempotency_key,
  attempt_count,
  last_failure_reason,
  last_failure_at,
  last_ambiguity_metadata,
  created_at,
  updated_at
`;

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value != null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function parseNullableJsonObject(
  value: unknown
): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function rowToSpendPaymentPrepareOperation(
  row: Record<string, unknown>
): SpendPaymentPrepareOperation {
  const attemptRaw = row.attempt_count;
  const attemptCount =
    typeof attemptRaw === 'number' && Number.isFinite(attemptRaw)
      ? attemptRaw
      : 0;

  return {
    id: String(row.id),
    spend_session_id: String(row.spend_session_id),
    user_id: String(row.user_id),
    spend_rail: normalizeSpendRail(row.spend_rail),
    status: row.status as SpendPaymentPrepareOperationStatus,
    prepared_action: parseJsonObject(row.prepared_action),
    verification_snapshot: parseJsonObject(row.verification_snapshot),
    idempotency_key: String(row.idempotency_key),
    attempt_count: attemptCount,
    last_failure_reason:
      row.last_failure_reason == null ? null : String(row.last_failure_reason),
    last_failure_at:
      row.last_failure_at == null ? null : String(row.last_failure_at),
    last_ambiguity_metadata: parseNullableJsonObject(
      row.last_ambiguity_metadata
    ),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

/** v1 deterministic idempotency key: one prepared payment operation per spend session. */
export function spendPaymentPrepareIdempotencyKey(
  spendSessionId: string
): string {
  return `payment:${spendSessionId}`;
}

async function getSpendPaymentPrepareByColumn(
  column: 'spend_session_id' | 'idempotency_key',
  value: string,
  label: string
): Promise<SpendPaymentPrepareOperation | null> {
  const { data, error } = await supabase
    .from('spend_payment_prepare_operations')
    .select(SPEND_PAYMENT_PREPARE_COLS)
    .eq(column, value)
    .maybeSingle();

  if (error) {
    console.error(`${label} error:`, error);
    throw new Error(
      error.message || 'Failed to load payment prepare operation'
    );
  }
  if (!data) return null;
  return rowToSpendPaymentPrepareOperation(data as Record<string, unknown>);
}

export async function getSpendPaymentPrepareBySessionId(
  spendSessionId: string
): Promise<SpendPaymentPrepareOperation | null> {
  return getSpendPaymentPrepareByColumn(
    'spend_session_id',
    spendSessionId,
    'getSpendPaymentPrepareBySessionId'
  );
}

export async function getSpendPaymentPrepareByIdempotencyKey(
  idempotencyKey: string
): Promise<SpendPaymentPrepareOperation | null> {
  return getSpendPaymentPrepareByColumn(
    'idempotency_key',
    idempotencyKey,
    'getSpendPaymentPrepareByIdempotencyKey'
  );
}

export type InsertSpendPaymentPrepareInput = {
  spendSessionId: string;
  userId: string;
  spendRail: SpendRail;
  preparedAction: Record<string, unknown>;
  verificationSnapshot: Record<string, unknown>;
};

/**
 * Inserts a prepared row or returns the existing row for the same idempotency key.
 * On unique conflict, fetches the existing row (same pattern as wallet readiness).
 */
export async function insertSpendPaymentPrepareOrGet(
  input: InsertSpendPaymentPrepareInput
): Promise<{ row: SpendPaymentPrepareOperation; created: boolean }> {
  const idempotency_key = spendPaymentPrepareIdempotencyKey(
    input.spendSessionId
  );
  const insertRow = {
    spend_session_id: input.spendSessionId,
    user_id: input.userId,
    spend_rail: input.spendRail,
    status: 'prepared' as const,
    prepared_action: input.preparedAction,
    verification_snapshot: input.verificationSnapshot,
    idempotency_key,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('spend_payment_prepare_operations')
    .insert(insertRow)
    .select(SPEND_PAYMENT_PREPARE_COLS)
    .single();

  if (!insertError && inserted) {
    return {
      row: rowToSpendPaymentPrepareOperation(
        inserted as Record<string, unknown>
      ),
      created: true,
    };
  }

  if (
    insertError?.code === '23505' ||
    insertError?.message?.includes('duplicate')
  ) {
    const existing =
      await getSpendPaymentPrepareByIdempotencyKey(idempotency_key);
    if (existing) {
      return { row: existing, created: false };
    }
  }

  console.error('insertSpendPaymentPrepareOrGet error:', insertError);
  throw new Error(
    insertError?.message || 'Failed to insert payment prepare operation'
  );
}

export type PatchSpendPaymentPrepareInput = {
  status?: SpendPaymentPrepareOperationStatus;
  preparedAction?: Record<string, unknown>;
  verificationSnapshot?: Record<string, unknown>;
  attemptCount?: number;
  lastFailureReason?: string | null;
  lastFailureAt?: string | null;
  lastAmbiguityMetadata?: Record<string, unknown> | null;
};

/**
 * Atomically claims a `prepared` row for Stellar backend submit (`prepared` → `submitting`).
 * Returns the updated row when this request won the race; otherwise `null`.
 */
export async function tryClaimSpendPaymentPrepareForStellarSubmit(
  prepareOperationId: string
): Promise<SpendPaymentPrepareOperation | null> {
  const { data, error } = await supabase
    .from('spend_payment_prepare_operations')
    .update({ status: 'submitting' })
    .eq('id', prepareOperationId)
    .eq('status', 'prepared')
    .select(SPEND_PAYMENT_PREPARE_COLS)
    .maybeSingle();

  if (error) {
    console.error('tryClaimSpendPaymentPrepareForStellarSubmit:', error);
    throw new Error(
      error.message || 'Failed to claim payment prepare for Stellar submit'
    );
  }
  if (!data) return null;
  return rowToSpendPaymentPrepareOperation(data as Record<string, unknown>);
}

export async function patchSpendPaymentPrepare(
  id: string,
  patch: PatchSpendPaymentPrepareInput
): Promise<SpendPaymentPrepareOperation> {
  const update: Record<string, unknown> = {};
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.preparedAction !== undefined) {
    update.prepared_action = patch.preparedAction;
  }
  if (patch.verificationSnapshot !== undefined) {
    update.verification_snapshot = patch.verificationSnapshot;
  }
  if (patch.attemptCount !== undefined) {
    update.attempt_count = patch.attemptCount;
  }
  if (patch.lastFailureReason !== undefined) {
    update.last_failure_reason = patch.lastFailureReason;
  }
  if (patch.lastFailureAt !== undefined) {
    update.last_failure_at = patch.lastFailureAt;
  }
  if (patch.lastAmbiguityMetadata !== undefined) {
    update.last_ambiguity_metadata = patch.lastAmbiguityMetadata;
  }

  if (Object.keys(update).length === 0) {
    const { data: existing, error: loadErr } = await supabase
      .from('spend_payment_prepare_operations')
      .select(SPEND_PAYMENT_PREPARE_COLS)
      .eq('id', id)
      .single();
    if (loadErr || !existing) {
      throw new Error(loadErr?.message || 'Failed to load payment prepare');
    }
    return rowToSpendPaymentPrepareOperation(
      existing as Record<string, unknown>
    );
  }

  const { data, error } = await supabase
    .from('spend_payment_prepare_operations')
    .update(update)
    .eq('id', id)
    .select(SPEND_PAYMENT_PREPARE_COLS)
    .single();

  if (error || !data) {
    console.error('patchSpendPaymentPrepare:', error);
    throw new Error(error?.message || 'Failed to patch payment prepare');
  }
  return rowToSpendPaymentPrepareOperation(data as Record<string, unknown>);
}

export async function updateSpendPaymentPreparePayload(
  id: string,
  patch: {
    preparedAction: Record<string, unknown>;
    verificationSnapshot: Record<string, unknown>;
  }
): Promise<SpendPaymentPrepareOperation> {
  return patchSpendPaymentPrepare(id, {
    preparedAction: patch.preparedAction,
    verificationSnapshot: patch.verificationSnapshot,
  });
}

export function spendPaymentOperationClientSummary(
  row: SpendPaymentPrepareOperation
): SpendPaymentOperationClientSummary {
  return {
    id: row.id,
    status: row.status,
    attempt_count: row.attempt_count,
    last_failure_reason: row.last_failure_reason,
    last_failure_at: row.last_failure_at,
  };
}

/**
 * Sessions with payment prepare rows that may need on-chain verification (IRL-22).
 */
export async function listSpendSessionIdsForStalePaymentPrepareReconcile(input: {
  olderThanIso: string;
  limit: number;
}): Promise<string[]> {
  const { data, error } = await supabase
    .from('spend_payment_prepare_operations')
    .select('spend_session_id')
    .in('status', ['submitted', 'prepared', 'submitting'])
    .lt('updated_at', input.olderThanIso)
    .order('updated_at', { ascending: true })
    .limit(input.limit);

  if (error) {
    console.error('listSpendSessionIdsForStalePaymentPrepareReconcile:', error);
    throw new Error(
      error.message || 'Failed to list payment prepare candidates'
    );
  }
  return (data ?? []).map((row) =>
    String((row as { spend_session_id: string }).spend_session_id)
  );
}

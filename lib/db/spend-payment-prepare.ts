import { supabase } from './client';
import { normalizeSpendRail } from './spend-rail';
import type {
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
  created_at,
  updated_at
`;

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value != null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function rowToSpendPaymentPrepareOperation(
  row: Record<string, unknown>
): SpendPaymentPrepareOperation {
  return {
    id: String(row.id),
    spend_session_id: String(row.spend_session_id),
    user_id: String(row.user_id),
    spend_rail: normalizeSpendRail(row.spend_rail),
    status: row.status as SpendPaymentPrepareOperationStatus,
    prepared_action: parseJsonObject(row.prepared_action),
    verification_snapshot: parseJsonObject(row.verification_snapshot),
    idempotency_key: String(row.idempotency_key),
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

export async function updateSpendPaymentPreparePayload(
  id: string,
  patch: {
    preparedAction: Record<string, unknown>;
    verificationSnapshot: Record<string, unknown>;
  }
): Promise<SpendPaymentPrepareOperation> {
  const { data, error } = await supabase
    .from('spend_payment_prepare_operations')
    .update({
      prepared_action: patch.preparedAction,
      verification_snapshot: patch.verificationSnapshot,
    })
    .eq('id', id)
    .select(SPEND_PAYMENT_PREPARE_COLS)
    .single();

  if (error || !data) {
    console.error('updateSpendPaymentPreparePayload:', error);
    throw new Error(error?.message || 'Failed to update payment prepare');
  }
  return rowToSpendPaymentPrepareOperation(data as Record<string, unknown>);
}

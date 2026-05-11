import { supabase } from './client';
import { normalizeSpendRail } from './spend-rail';
import type {
  SpendRail,
  SpendWalletReadinessOperation,
  SpendWalletReadinessStatus,
} from '@/lib/types';

export const WALLET_READINESS_COLS = `
  id,
  spend_session_id,
  user_id,
  spend_rail,
  rail_user_wallet_address,
  status,
  step_metadata,
  sanitized_error_category,
  sanitized_error_code,
  internal_diagnostics,
  idempotency_key,
  sponsor_treasury_transaction_id,
  trustline_treasury_transaction_id,
  created_at,
  updated_at
`;

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function rowToSpendWalletReadinessOperation(
  row: Record<string, unknown>
): SpendWalletReadinessOperation {
  const step = parseJsonObject(row.step_metadata);
  const internal = parseJsonObject(row.internal_diagnostics);
  return {
    id: String(row.id),
    spend_session_id: String(row.spend_session_id),
    user_id: String(row.user_id),
    spend_rail: normalizeSpendRail(row.spend_rail),
    rail_user_wallet_address: String(row.rail_user_wallet_address),
    status: row.status as SpendWalletReadinessStatus,
    step_metadata: step ?? {},
    sanitized_error_category:
      row.sanitized_error_category == null
        ? null
        : String(row.sanitized_error_category),
    sanitized_error_code:
      row.sanitized_error_code == null
        ? null
        : String(row.sanitized_error_code),
    internal_diagnostics: internal,
    idempotency_key: String(row.idempotency_key),
    sponsor_treasury_transaction_id:
      row.sponsor_treasury_transaction_id == null
        ? null
        : String(row.sponsor_treasury_transaction_id),
    trustline_treasury_transaction_id:
      row.trustline_treasury_transaction_id == null
        ? null
        : String(row.trustline_treasury_transaction_id),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

/** v1 deterministic idempotency key: one readiness row per spend session. */
export function spendWalletReadinessIdempotencyKey(
  spendSessionId: string
): string {
  return `wallet_readiness:${spendSessionId}`;
}

export async function getSpendWalletReadinessBySessionId(
  spendSessionId: string
): Promise<SpendWalletReadinessOperation | null> {
  const { data, error } = await supabase
    .from('spend_wallet_readiness_operations')
    .select(WALLET_READINESS_COLS)
    .eq('spend_session_id', spendSessionId)
    .maybeSingle();

  if (error) {
    console.error('getSpendWalletReadinessBySessionId error:', error);
    throw new Error(error.message || 'Failed to load wallet readiness');
  }
  if (!data) return null;
  return rowToSpendWalletReadinessOperation(data as Record<string, unknown>);
}

export async function getSpendWalletReadinessByIdempotencyKey(
  idempotencyKey: string
): Promise<SpendWalletReadinessOperation | null> {
  const { data, error } = await supabase
    .from('spend_wallet_readiness_operations')
    .select(WALLET_READINESS_COLS)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (error) {
    console.error('getSpendWalletReadinessByIdempotencyKey error:', error);
    throw new Error(error.message || 'Failed to load wallet readiness');
  }
  if (!data) return null;
  return rowToSpendWalletReadinessOperation(data as Record<string, unknown>);
}

export type InsertSpendWalletReadinessPendingInput = {
  spendSessionId: string;
  userId: string;
  spendRail: SpendRail;
  /** Same convention as `spend_sessions.rail_user_wallet_address` (trimmed). */
  railUserWalletAddress: string;
  status?: SpendWalletReadinessStatus;
  stepMetadata?: Record<string, unknown>;
};

/**
 * Inserts a pending readiness row or returns the existing row for the same
 * idempotency key (unique constraint on `idempotency_key`).
 */
export async function insertPendingSpendWalletReadinessOrGet(
  input: InsertSpendWalletReadinessPendingInput
): Promise<{ row: SpendWalletReadinessOperation; created: boolean }> {
  const idempotency_key = spendWalletReadinessIdempotencyKey(
    input.spendSessionId
  );
  const rail = input.railUserWalletAddress.trim();
  const insertRow = {
    spend_session_id: input.spendSessionId,
    user_id: input.userId,
    spend_rail: input.spendRail,
    rail_user_wallet_address: rail,
    status: input.status ?? ('pending' as const),
    step_metadata: input.stepMetadata ?? {},
    idempotency_key,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('spend_wallet_readiness_operations')
    .insert(insertRow)
    .select(WALLET_READINESS_COLS)
    .single();

  if (!insertError && inserted) {
    return {
      row: rowToSpendWalletReadinessOperation(
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
      await getSpendWalletReadinessByIdempotencyKey(idempotency_key);
    if (existing) {
      return { row: existing, created: false };
    }
  }

  console.error('insertPendingSpendWalletReadinessOrGet error:', insertError);
  throw new Error(
    insertError?.message || 'Failed to insert wallet readiness operation'
  );
}

export async function updateSpendWalletReadinessFields(
  id: string,
  patch: Partial<
    Pick<
      SpendWalletReadinessOperation,
      | 'status'
      | 'step_metadata'
      | 'sanitized_error_category'
      | 'sanitized_error_code'
      | 'internal_diagnostics'
      | 'sponsor_treasury_transaction_id'
      | 'trustline_treasury_transaction_id'
    >
  >
): Promise<SpendWalletReadinessOperation> {
  const { data, error } = await supabase
    .from('spend_wallet_readiness_operations')
    .update(patch)
    .eq('id', id)
    .select(WALLET_READINESS_COLS)
    .single();

  if (error || !data) {
    console.error('updateSpendWalletReadinessFields:', error);
    throw new Error(error?.message || 'Failed to update wallet readiness');
  }
  return rowToSpendWalletReadinessOperation(data as Record<string, unknown>);
}

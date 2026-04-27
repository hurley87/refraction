import { supabase } from './client';
import { computeSpendSessionExpiresAt } from '@/lib/spend-experience-guard';
import type {
  PointConversion,
  SpendExperience,
  SpendSession,
  SpendSessionStatus,
} from '@/lib/types';

const SESSION_COLS = `
  id,
  spend_experience_id,
  user_id,
  wallet_address,
  status,
  qr_token_hash,
  created_at,
  expires_at,
  completed_at
`;

const CONVERSION_COLS = `
  id,
  spend_experience_id,
  spend_session_id,
  user_id,
  points_deducted,
  usdc_amount,
  status,
  treasury_wallet_address,
  user_wallet_address,
  funding_tx_hash,
  idempotency_key,
  created_at,
  completed_at,
  failed_reason
`;

function toNum(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return NaN;
}

function rowToSession(row: Record<string, unknown>): SpendSession {
  return {
    id: String(row.id),
    spend_experience_id: String(row.spend_experience_id),
    user_id: String(row.user_id),
    wallet_address: String(row.wallet_address),
    status: row.status as SpendSession['status'],
    qr_token_hash: row.qr_token_hash == null ? null : String(row.qr_token_hash),
    created_at: String(row.created_at),
    expires_at: String(row.expires_at),
    completed_at: row.completed_at == null ? null : String(row.completed_at),
  };
}

function rowToConversion(row: Record<string, unknown>): PointConversion {
  return {
    id: String(row.id),
    spend_experience_id: String(row.spend_experience_id),
    spend_session_id: String(row.spend_session_id),
    user_id: String(row.user_id),
    points_deducted: toNum(row.points_deducted),
    usdc_amount: toNum(row.usdc_amount),
    status: row.status as PointConversion['status'],
    treasury_wallet_address: String(row.treasury_wallet_address),
    user_wallet_address: String(row.user_wallet_address),
    funding_tx_hash:
      row.funding_tx_hash == null ? null : String(row.funding_tx_hash),
    idempotency_key:
      row.idempotency_key == null ? null : String(row.idempotency_key),
    created_at: String(row.created_at),
    completed_at: row.completed_at == null ? null : String(row.completed_at),
    failed_reason: row.failed_reason == null ? null : String(row.failed_reason),
  };
}

export async function getSpendSessionById(
  sessionId: string
): Promise<SpendSession | null> {
  const { data, error } = await supabase
    .from('spend_sessions')
    .select(SESSION_COLS)
    .eq('id', sessionId)
    .maybeSingle();

  if (error) {
    console.error('getSpendSessionById error:', error);
    throw new Error(error.message || 'Failed to load spend session');
  }
  if (!data) return null;
  return rowToSession(data as Record<string, unknown>);
}

export async function getPointConversionBySessionId(
  sessionId: string
): Promise<PointConversion | null> {
  const { data, error } = await supabase
    .from('point_conversions')
    .select(CONVERSION_COLS)
    .eq('spend_session_id', sessionId)
    .maybeSingle();

  if (error) {
    console.error('getPointConversionBySessionId error:', error);
    throw new Error(error.message || 'Failed to load point conversion');
  }
  if (!data) return null;
  return rowToConversion(data as Record<string, unknown>);
}

type CreateSessionInput = {
  spendExperience: SpendExperience;
  userId: string;
  walletAddress: string;
  now?: Date;
};

/**
 * Create a spend session for (experience, user) or return the existing row.
 * New sessions use status `created` and expires_at from the experience window.
 */
export async function createOrGetSpendSession(
  input: CreateSessionInput
): Promise<{ session: SpendSession; created: boolean }> {
  const now = input.now ?? new Date();
  const expiresAt = computeSpendSessionExpiresAt(
    input.spendExperience,
    now
  ).toISOString();

  const insertRow = {
    spend_experience_id: input.spendExperience.id,
    user_id: input.userId,
    wallet_address: input.walletAddress,
    status: 'created' as SpendSessionStatus,
    expires_at: expiresAt,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('spend_sessions')
    .insert(insertRow)
    .select(SESSION_COLS)
    .single();

  if (!insertError && inserted) {
    return {
      session: rowToSession(inserted as Record<string, unknown>),
      created: true,
    };
  }

  // Unique violation: return existing session
  if (
    insertError?.code === '23505' ||
    insertError?.message?.includes('duplicate')
  ) {
    const { data: existing, error: fetchError } = await supabase
      .from('spend_sessions')
      .select(SESSION_COLS)
      .eq('spend_experience_id', input.spendExperience.id)
      .eq('user_id', input.userId)
      .maybeSingle();

    if (fetchError) {
      console.error(
        'createOrGetSpendSession fetch after conflict:',
        fetchError
      );
      throw new Error(fetchError.message || 'Failed to load spend session');
    }
    if (existing) {
      return {
        session: rowToSession(existing as Record<string, unknown>),
        created: false,
      };
    }
  }

  console.error('createOrGetSpendSession error:', insertError);
  throw new Error(insertError?.message || 'Failed to create spend session');
}

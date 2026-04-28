import { supabase } from './client';
import { computeSpendSessionExpiresAt } from '@/lib/spend-experience-guard';
import type {
  PointConversion,
  SpendExperience,
  SpendSession,
  SpendSessionStatus,
  SpendTransaction,
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

const SPEND_TX_COLS = `
  id,
  spend_experience_id,
  spend_session_id,
  user_id,
  usdc_amount,
  from_wallet_address,
  to_wallet_address,
  status,
  payment_tx_hash,
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

function rowToSpendTransaction(row: Record<string, unknown>): SpendTransaction {
  return {
    id: String(row.id),
    spend_experience_id: String(row.spend_experience_id),
    spend_session_id: String(row.spend_session_id),
    user_id: String(row.user_id),
    usdc_amount: toNum(row.usdc_amount),
    from_wallet_address: String(row.from_wallet_address),
    to_wallet_address: String(row.to_wallet_address),
    status: row.status as SpendTransaction['status'],
    payment_tx_hash:
      row.payment_tx_hash == null ? null : String(row.payment_tx_hash),
    idempotency_key:
      row.idempotency_key == null ? null : String(row.idempotency_key),
    created_at: String(row.created_at),
    completed_at: row.completed_at == null ? null : String(row.completed_at),
    failed_reason: row.failed_reason == null ? null : String(row.failed_reason),
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

export async function getSpendTransactionBySessionId(
  sessionId: string
): Promise<SpendTransaction | null> {
  const { data, error } = await supabase
    .from('spend_transactions')
    .select(SPEND_TX_COLS)
    .eq('spend_session_id', sessionId)
    .maybeSingle();

  if (error) {
    console.error('getSpendTransactionBySessionId error:', error);
    throw new Error(error.message || 'Failed to load spend transaction');
  }
  if (!data) return null;
  return rowToSpendTransaction(data as Record<string, unknown>);
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

/**
 * Returns a funded conversion for (experience, user) if one exists (one per user per experience).
 */
export async function getFundedPointConversionForUserExperience(
  spendExperienceId: string,
  userId: string
): Promise<PointConversion | null> {
  const { data, error } = await supabase
    .from('point_conversions')
    .select(CONVERSION_COLS)
    .eq('spend_experience_id', spendExperienceId)
    .eq('user_id', userId)
    .eq('status', 'funded')
    .maybeSingle();

  if (error) {
    console.error('getFundedPointConversionForUserExperience error:', error);
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

export type ConfirmSpendConversionRpcResult = {
  outcome: 'created' | 'already_exists';
  conversionId: string;
  playerTotalPoints: number;
};

/**
 * Atomically deduct points and create `point_conversions` (status `points_deducted`), or return existing
 * conversion for the session. Requires `confirm_spend_conversion_atomic` in the database.
 */
export async function confirmSpendConversionAtomic(input: {
  spendSessionId: string;
  userId: string;
  walletAddress: string;
  spendExperienceId: string;
  pointsToDeduct: number;
  usdcAmount: number;
  treasuryWalletAddress: string;
  userWalletAddress: string;
}): Promise<ConfirmSpendConversionRpcResult> {
  const { data, error } = await supabase.rpc(
    'confirm_spend_conversion_atomic',
    {
      p_spend_session_id: input.spendSessionId,
      p_user_id: input.userId,
      p_wallet_address: input.walletAddress,
      p_spend_experience_id: input.spendExperienceId,
      p_points_to_deduct: input.pointsToDeduct,
      p_usdc_amount: input.usdcAmount,
      p_treasury_wallet_address: input.treasuryWalletAddress,
      p_user_wallet_address: input.userWalletAddress,
    }
  );

  if (error) {
    throw new Error(error.message || 'confirm_spend_conversion_atomic failed');
  }

  const row = Array.isArray(data) ? data[0] : data;
  const outcome = row?.outcome as string | undefined;
  const conversionId = row?.conversion_id as string | undefined;
  const playerTotalPoints = row?.player_total_points;

  if (
    (outcome !== 'created' && outcome !== 'already_exists') ||
    !conversionId ||
    typeof playerTotalPoints !== 'number'
  ) {
    throw new Error(
      'Unexpected RPC response from confirm_spend_conversion_atomic'
    );
  }

  return {
    outcome,
    conversionId,
    playerTotalPoints,
  };
}

export async function updatePointConversionFields(
  conversionId: string,
  patch: Partial<
    Pick<
      PointConversion,
      'status' | 'funding_tx_hash' | 'completed_at' | 'failed_reason'
    >
  >
): Promise<PointConversion> {
  const { data, error } = await supabase
    .from('point_conversions')
    .update(patch)
    .eq('id', conversionId)
    .select(CONVERSION_COLS)
    .single();

  if (error || !data) {
    console.error('updatePointConversionFields:', error);
    throw new Error(error?.message || 'Failed to update point conversion');
  }
  return rowToConversion(data as Record<string, unknown>);
}

export async function updateSpendSessionStatus(
  sessionId: string,
  status: SpendSessionStatus,
  extra?: { completed_at?: string | null }
): Promise<void> {
  const patch: { status: SpendSessionStatus; completed_at?: string | null } = {
    status,
  };
  if (extra?.completed_at !== undefined) {
    patch.completed_at = extra.completed_at;
  }
  const { error } = await supabase
    .from('spend_sessions')
    .update(patch)
    .eq('id', sessionId);

  if (error) {
    console.error('updateSpendSessionStatus:', error);
    throw new Error(error.message || 'Failed to update spend session');
  }
}

export async function insertSpendTransactionSubmitted(input: {
  spendExperienceId: string;
  spendSessionId: string;
  userId: string;
  usdcAmount: number;
  fromWalletAddress: string;
  toWalletAddress: string;
  paymentTxHash: string;
}): Promise<SpendTransaction | 'session_duplicate'> {
  const idempotencyKey = `spend_payment:${input.spendSessionId}`;
  const row = {
    spend_experience_id: input.spendExperienceId,
    spend_session_id: input.spendSessionId,
    user_id: input.userId,
    usdc_amount: input.usdcAmount,
    from_wallet_address: input.fromWalletAddress,
    to_wallet_address: input.toWalletAddress,
    status: 'submitted' as const,
    payment_tx_hash: input.paymentTxHash,
    idempotency_key: idempotencyKey,
  };

  const { data, error } = await supabase
    .from('spend_transactions')
    .insert(row)
    .select(SPEND_TX_COLS)
    .single();

  if (!error && data) {
    return rowToSpendTransaction(data as Record<string, unknown>);
  }

  if (
    error?.code === '23505' ||
    error?.message?.toLowerCase().includes('duplicate')
  ) {
    return 'session_duplicate';
  }

  console.error('insertSpendTransactionSubmitted:', error);
  throw new Error(error?.message || 'Failed to record spend transaction');
}

export async function updateSpendTransactionFields(
  spendTransactionId: string,
  patch: Partial<
    Pick<
      SpendTransaction,
      'status' | 'payment_tx_hash' | 'completed_at' | 'failed_reason'
    >
  >
): Promise<SpendTransaction> {
  const { data, error } = await supabase
    .from('spend_transactions')
    .update(patch)
    .eq('id', spendTransactionId)
    .select(SPEND_TX_COLS)
    .single();

  if (error || !data) {
    console.error('updateSpendTransactionFields:', error);
    throw new Error(error?.message || 'Failed to update spend transaction');
  }
  return rowToSpendTransaction(data as Record<string, unknown>);
}

/**
 * Atomically moves a row from `submitted` → `confirmed` when still submitted (idempotent under concurrency).
 * Returns the updated row, or null if no row matched (already confirmed or wrong state).
 */
export async function confirmSpendTransactionIfSubmitted(
  spendTransactionId: string
): Promise<SpendTransaction | null> {
  const completedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('spend_transactions')
    .update({
      status: 'confirmed',
      completed_at: completedAt,
      failed_reason: null,
    })
    .eq('id', spendTransactionId)
    .eq('status', 'submitted')
    .select(SPEND_TX_COLS)
    .maybeSingle();

  if (error) {
    console.error('confirmSpendTransactionIfSubmitted:', error);
    throw new Error(error.message || 'Failed to confirm spend transaction');
  }
  if (!data) return null;
  return rowToSpendTransaction(data as Record<string, unknown>);
}

/**
 * If USDC transfer fails after points were deducted, refund points and mark conversion `failed`.
 */
export async function refundSpendConversionOnFundingFailure(input: {
  conversionId: string;
  userId: string;
  spendSessionId: string;
  pointsToRefund: number;
  failedReason: string;
}): Promise<void> {
  const { error } = await supabase.rpc(
    'refund_spend_conversion_on_funding_failure',
    {
      p_conversion_id: input.conversionId,
      p_user_id: input.userId,
      p_spend_session_id: input.spendSessionId,
      p_points_to_refund: input.pointsToRefund,
      p_failed_reason: input.failedReason,
    }
  );

  if (error) {
    throw new Error(
      error.message || 'refund_spend_conversion_on_funding_failure failed'
    );
  }
}

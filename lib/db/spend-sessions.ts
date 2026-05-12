import { supabase } from './client';
import {
  CONVERSION_COLS,
  SESSION_COLS,
  SPEND_TX_COLS,
  rowToConversion,
  rowToSession,
  rowToSpendTransaction,
} from './spend-ledger-rows';
import { computeSpendSessionExpiresAt } from '@/lib/spend-experience-guard';
import {
  explorerTxUrlForSpendLedger,
  spendLedgerNetworkLabel,
} from '@/lib/spend-ledger-explorer-url';
import type {
  PointConversion,
  SpendExperience,
  SpendRail,
  SpendSession,
  SpendSessionStatus,
  SpendTransaction,
} from '@/lib/types';

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
  /** NULL for stellar_usdc until conversion readiness (IRL-21). */
  railUserWalletAddress: string | null;
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
    spend_rail: input.spendExperience.spend_rail,
    rail_user_wallet_address: input.railUserWalletAddress,
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
      | 'status'
      | 'funding_tx_hash'
      | 'completed_at'
      | 'failed_reason'
      | 'explorer_tx_url'
      | 'idempotency_key'
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

/** Sets `rail_user_wallet_address` after Stellar wallet readiness (IRL-21). */
export async function updateSpendSessionRailUserWalletAddress(
  sessionId: string,
  railUserWalletAddress: string
): Promise<SpendSession> {
  const trimmed = railUserWalletAddress.trim();
  const { data, error } = await supabase
    .from('spend_sessions')
    .update({ rail_user_wallet_address: trimmed })
    .eq('id', sessionId)
    .select(SESSION_COLS)
    .single();

  if (error || !data) {
    console.error('updateSpendSessionRailUserWalletAddress:', error);
    throw new Error(
      error?.message || 'Failed to update spend session rail wallet'
    );
  }
  return rowToSession(data as Record<string, unknown>);
}

export async function insertSpendTransactionSubmitted(input: {
  spendExperienceId: string;
  spendSessionId: string;
  userId: string;
  usdcAmount: number;
  fromWalletAddress: string;
  toWalletAddress: string;
  paymentTxHash: string;
  spendRail: SpendRail;
}): Promise<SpendTransaction | 'session_duplicate'> {
  const idempotencyKey = `spend_payment:${input.spendSessionId}`;
  const spend_rail = input.spendRail;
  const explorer = explorerTxUrlForSpendLedger(spend_rail, input.paymentTxHash);
  const row = {
    spend_experience_id: input.spendExperienceId,
    spend_session_id: input.spendSessionId,
    user_id: input.userId,
    usdc_amount: input.usdcAmount,
    spend_rail,
    network: spendLedgerNetworkLabel(spend_rail),
    asset_symbol: 'USDC',
    from_wallet_address: input.fromWalletAddress,
    to_wallet_address: input.toWalletAddress,
    status: 'submitted' as const,
    payment_tx_hash: input.paymentTxHash,
    explorer_tx_url: explorer,
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
      | 'status'
      | 'payment_tx_hash'
      | 'completed_at'
      | 'failed_reason'
      | 'explorer_tx_url'
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

/** Deterministic idempotency key for treasury→user conversion funding (IRL-20). */
export function spendConversionFundingIdempotencyKey(
  pointConversionId: string
): string {
  return `fund_user:${pointConversionId}`;
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

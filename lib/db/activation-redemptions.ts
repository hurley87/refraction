import { supabase } from '@/lib/db/client';
import type { ActivationRedemptionStatus } from '@/lib/schemas/activation-redemption';

export type ActivationRedemptionRow = {
  id: string;
  activation_id: string;
  reward_item_id: string;
  user_id: number;
  eligibility_event_id: string;
  status: ActivationRedemptionStatus;
  idempotency_key: string;
  points_spent: number | null;
  usdc_amount_snapshot: number | null;
  purchase_confirmed_at: string | null;
  redeemed_at: string | null;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
};

const TABLE = 'activation_redemption';

function toNumber(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return NaN;
}

function toIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = toNumber(value);
  return Number.isNaN(n) ? null : Math.trunc(n);
}

function normalizeRow(row: Record<string, unknown>): ActivationRedemptionRow {
  return {
    id: String(row.id),
    activation_id: String(row.activation_id),
    reward_item_id: String(row.reward_item_id),
    user_id: Number(row.user_id),
    eligibility_event_id: String(row.eligibility_event_id),
    status: row.status as ActivationRedemptionStatus,
    idempotency_key: String(row.idempotency_key),
    points_spent: toIntOrNull(row.points_spent),
    usdc_amount_snapshot:
      row.usdc_amount_snapshot === null ||
      row.usdc_amount_snapshot === undefined
        ? null
        : toNumber(row.usdc_amount_snapshot),
    purchase_confirmed_at:
      row.purchase_confirmed_at == null
        ? null
        : String(row.purchase_confirmed_at),
    redeemed_at: row.redeemed_at == null ? null : String(row.redeemed_at),
    cancelled_reason:
      row.cancelled_reason == null ? null : String(row.cancelled_reason),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listRedemptionsForUserActivation(input: {
  activationId: string;
  userId: number;
}): Promise<ActivationRedemptionRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('activation_id', input.activationId)
    .eq('user_id', input.userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('listRedemptionsForUserActivation:', error);
    throw new Error(error.message || 'Failed to list redemptions');
  }
  return (data ?? []).map((r) => normalizeRow(r as Record<string, unknown>));
}

export async function listRedemptionsForEligibilityEvent(
  eligibilityEventId: string
): Promise<ActivationRedemptionRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('eligibility_event_id', eligibilityEventId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('listRedemptionsForEligibilityEvent:', error);
    throw new Error(error.message || 'Failed to list redemptions for event');
  }
  return (data ?? []).map((r) => normalizeRow(r as Record<string, unknown>));
}

export type InsertActivationRedemptionInput = {
  activation_id: string;
  reward_item_id: string;
  user_id: number;
  eligibility_event_id: string;
  status: ActivationRedemptionStatus;
  idempotency_key: string;
};

export async function insertActivationRedemption(
  input: InsertActivationRedemptionInput
): Promise<ActivationRedemptionRow> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      activation_id: input.activation_id,
      reward_item_id: input.reward_item_id,
      user_id: input.user_id,
      eligibility_event_id: input.eligibility_event_id,
      status: input.status,
      idempotency_key: input.idempotency_key,
    })
    .select('*')
    .single();

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === '23505') {
      const existing = await getActivationRedemptionByIdempotencyKey(
        input.idempotency_key
      );
      if (existing) return existing;
    }
    console.error('insertActivationRedemption:', error);
    throw new Error(error.message || 'Failed to create redemption');
  }
  return normalizeRow(data as Record<string, unknown>);
}

export async function getActivationRedemptionById(
  redemptionId: string
): Promise<ActivationRedemptionRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', redemptionId)
    .maybeSingle();
  if (error) {
    console.error('getActivationRedemptionById:', error);
    throw new Error(error.message || 'Failed to load redemption');
  }
  if (!data) return null;
  return normalizeRow(data as Record<string, unknown>);
}

/** Counts completed confirm-purchase outcomes for rate limits (IRL-54). */
export async function countActivationPurchaseConfirmsForUserActivation(input: {
  activationId: string;
  userId: number;
}): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('activation_id', input.activationId)
    .eq('user_id', input.userId)
    .not('purchase_confirmed_at', 'is', null);
  if (error) {
    console.error('countActivationPurchaseConfirmsForUserActivation:', error);
    throw new Error(error.message || 'Failed to count purchase confirms');
  }
  return count ?? 0;
}

export async function countActivationPurchaseConfirmsForUserActivationInUtcWindow(input: {
  activationId: string;
  userId: number;
  purchaseConfirmedAtGte: string;
  purchaseConfirmedAtLt: string;
}): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('activation_id', input.activationId)
    .eq('user_id', input.userId)
    .not('purchase_confirmed_at', 'is', null)
    .gte('purchase_confirmed_at', input.purchaseConfirmedAtGte)
    .lt('purchase_confirmed_at', input.purchaseConfirmedAtLt);
  if (error) {
    console.error(
      'countActivationPurchaseConfirmsForUserActivationInUtcWindow:',
      error
    );
    throw new Error(error.message || 'Failed to count daily purchase confirms');
  }
  return count ?? 0;
}

export type ConfirmActivationPurchaseRpcResult = {
  outcome: 'created' | 'already_confirmed';
  playerTotalPoints: number;
};

function readConfirmActivationPurchaseRpcRow(
  data: unknown
): ConfirmActivationPurchaseRpcResult | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const outcome = r.outcome;
  const ptsRaw = r.player_total_points ?? r.playerTotalPoints;
  let pts = NaN;
  if (typeof ptsRaw === 'number' && Number.isFinite(ptsRaw)) {
    pts = ptsRaw;
  } else if (typeof ptsRaw === 'string') {
    const parsedPts = parseInt(ptsRaw, 10);
    pts = Number.isNaN(parsedPts) ? NaN : parsedPts;
  }
  if (
    (outcome !== 'created' && outcome !== 'already_confirmed') ||
    !Number.isFinite(pts)
  ) {
    return null;
  }
  return { outcome, playerTotalPoints: pts };
}

/**
 * Atomically deduct points (when configured), bump activation cap counter, and move redemption
 * to `ready_to_redeem`. Requires `confirm_activation_purchase_atomic` in the database (IRL-54).
 * Passes eligibility per-user caps so limits are enforced inside the RPC after locking the activation.
 */
export async function confirmActivationPurchaseAtomic(input: {
  redemptionId: string;
  playerId: number;
  walletAddress: string;
  maxPurchaseConfirmsPerUser: number;
  maxPurchaseConfirmsPerUserPerDay: number;
}): Promise<ConfirmActivationPurchaseRpcResult> {
  const { data, error } = await supabase.rpc(
    'confirm_activation_purchase_atomic',
    {
      p_redemption_id: input.redemptionId,
      p_player_id: input.playerId,
      p_wallet_address: input.walletAddress,
      p_max_purchase_confirms_per_user: input.maxPurchaseConfirmsPerUser,
      p_max_purchase_confirms_per_user_per_day:
        input.maxPurchaseConfirmsPerUserPerDay,
    }
  );

  if (error) {
    throw new Error(
      error.message || 'confirm_activation_purchase_atomic failed'
    );
  }

  const parsed = readConfirmActivationPurchaseRpcRow(data);
  if (!parsed) {
    throw new Error(
      'Unexpected RPC response from confirm_activation_purchase_atomic'
    );
  }
  return parsed;
}

export type SwipeActivationRedeemRpcOutcome =
  | 'created'
  | 'already_redeemed'
  | 'expired';

export type SwipeActivationRedeemRpcResult = {
  outcome: SwipeActivationRedeemRpcOutcome;
};

function readSwipeActivationRedeemRpcRow(
  data: unknown
): SwipeActivationRedeemRpcResult | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const outcome = r.outcome;
  if (
    outcome !== 'created' &&
    outcome !== 'already_redeemed' &&
    outcome !== 'expired'
  ) {
    return null;
  }
  return { outcome };
}

/**
 * Atomically completes in-venue swipe: `ready_to_redeem` → `settlement_pending`, one queued settlement row.
 * Requires `swipe_activation_redeem_atomic` in the database (IRL-55).
 */
export async function swipeActivationRedeemAtomic(input: {
  redemptionId: string;
  playerId: number;
  walletAddress: string;
  maxSwipeRedeemsPerUser: number;
  maxSwipeRedeemsPerUserPerDay: number;
}): Promise<SwipeActivationRedeemRpcResult> {
  const { data, error } = await supabase.rpc('swipe_activation_redeem_atomic', {
    p_redemption_id: input.redemptionId,
    p_player_id: input.playerId,
    p_wallet_address: input.walletAddress,
    p_max_swipe_redeems_per_user: input.maxSwipeRedeemsPerUser,
    p_max_swipe_redeems_per_user_per_day: input.maxSwipeRedeemsPerUserPerDay,
  });

  if (error) {
    throw new Error(error.message || 'swipe_activation_redeem_atomic failed');
  }

  const parsed = readSwipeActivationRedeemRpcRow(data);
  if (!parsed) {
    throw new Error(
      'Unexpected RPC response from swipe_activation_redeem_atomic'
    );
  }
  return parsed;
}

export type CancelActivationRedemptionRpcOutcome =
  | 'cancelled'
  | 'already_cancelled';

export type CancelActivationRedemptionRpcResult = {
  outcome: CancelActivationRedemptionRpcOutcome;
};

function readCancelActivationRedemptionRpcRow(
  data: unknown
): CancelActivationRedemptionRpcResult | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const outcome = r.outcome;
  if (outcome !== 'cancelled' && outcome !== 'already_cancelled') {
    return null;
  }
  return { outcome };
}

/**
 * User cancel from `ready_to_redeem` only. Requires `cancel_activation_redemption_atomic` (IRL-55).
 */
export async function cancelActivationRedemptionAtomic(input: {
  redemptionId: string;
  playerId: number;
  walletAddress: string;
  reason: string | null;
}): Promise<CancelActivationRedemptionRpcResult> {
  const { data, error } = await supabase.rpc(
    'cancel_activation_redemption_atomic',
    {
      p_redemption_id: input.redemptionId,
      p_player_id: input.playerId,
      p_wallet_address: input.walletAddress,
      p_reason: input.reason,
    }
  );

  if (error) {
    throw new Error(
      error.message || 'cancel_activation_redemption_atomic failed'
    );
  }

  const parsed = readCancelActivationRedemptionRpcRow(data);
  if (!parsed) {
    throw new Error(
      'Unexpected RPC response from cancel_activation_redemption_atomic'
    );
  }
  return parsed;
}

export async function getActivationRedemptionByIdempotencyKey(
  idempotencyKey: string
): Promise<ActivationRedemptionRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (error) {
    console.error('getActivationRedemptionByIdempotencyKey:', error);
    throw new Error(error.message || 'Failed to load redemption');
  }
  if (!data) return null;
  return normalizeRow(data as Record<string, unknown>);
}

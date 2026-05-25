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
  created_at: string;
  updated_at: string;
};

const TABLE = 'activation_redemption';

function normalizeRow(row: Record<string, unknown>): ActivationRedemptionRow {
  return {
    id: String(row.id),
    activation_id: String(row.activation_id),
    reward_item_id: String(row.reward_item_id),
    user_id: Number(row.user_id),
    eligibility_event_id: String(row.eligibility_event_id),
    status: row.status as ActivationRedemptionStatus,
    idempotency_key: String(row.idempotency_key),
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

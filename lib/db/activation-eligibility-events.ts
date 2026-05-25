import { supabase } from '@/lib/db/client';
import type { ActivationEligibilitySource } from '@/lib/schemas/activation-eligibility';

export type ActivationEligibilityEventRow = {
  id: string;
  activation_id: string;
  user_id: number;
  wallet_address: string | null;
  source: ActivationEligibilitySource;
  source_ref_id: string | null;
  occurred_at: string;
  metadata: Record<string, unknown>;
};

const TABLE = 'activation_eligibility_event';

function normalizeRow(
  row: Record<string, unknown>
): ActivationEligibilityEventRow {
  return {
    id: String(row.id),
    activation_id: String(row.activation_id),
    user_id: Number(row.user_id),
    wallet_address:
      row.wallet_address == null ? null : String(row.wallet_address),
    source: row.source as ActivationEligibilitySource,
    source_ref_id: row.source_ref_id == null ? null : String(row.source_ref_id),
    occurred_at: String(row.occurred_at),
    metadata:
      row.metadata != null && typeof row.metadata === 'object'
        ? (row.metadata as Record<string, unknown>)
        : {},
  };
}

export async function findEligibilityEventByLogicalKey(input: {
  activationId: string;
  userId: number;
  source: ActivationEligibilitySource;
  sourceRefId: string;
}): Promise<ActivationEligibilityEventRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('activation_id', input.activationId)
    .eq('user_id', input.userId)
    .eq('source', input.source)
    .eq('source_ref_id', input.sourceRefId)
    .maybeSingle();

  if (error) {
    console.error('findEligibilityEventByLogicalKey:', error);
    throw new Error(error.message || 'Failed to load eligibility event');
  }
  if (!data) return null;
  return normalizeRow(data as Record<string, unknown>);
}

export async function countEligibilityEventsForUserActivation(input: {
  activationId: string;
  userId: number;
}): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('activation_id', input.activationId)
    .eq('user_id', input.userId);
  if (error) {
    console.error('countEligibilityEventsForUserActivation:', error);
    throw new Error(error.message || 'Failed to count eligibility events');
  }
  return count ?? 0;
}

export async function countEligibilityEventsForUserActivationInUtcWindow(input: {
  activationId: string;
  userId: number;
  occurredAtGte: string;
  occurredAtLt: string;
}): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('activation_id', input.activationId)
    .eq('user_id', input.userId)
    .gte('occurred_at', input.occurredAtGte)
    .lt('occurred_at', input.occurredAtLt);
  if (error) {
    console.error('countEligibilityEventsForUserActivationInUtcWindow:', error);
    throw new Error(
      error.message || 'Failed to count daily eligibility events'
    );
  }
  return count ?? 0;
}

export async function listEligibilityEventsForUserActivation(input: {
  activationId: string;
  userId: number;
}): Promise<ActivationEligibilityEventRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('activation_id', input.activationId)
    .eq('user_id', input.userId)
    .order('occurred_at', { ascending: false });
  if (error) {
    console.error('listEligibilityEventsForUserActivation:', error);
    throw new Error(error.message || 'Failed to list eligibility events');
  }
  return (data ?? []).map((r) => normalizeRow(r as Record<string, unknown>));
}

export type InsertActivationEligibilityEventInput = {
  activation_id: string;
  user_id: number;
  wallet_address: string | null;
  source: ActivationEligibilitySource;
  source_ref_id: string;
  occurred_at: string;
  metadata: Record<string, unknown>;
};

export async function insertActivationEligibilityEvent(
  input: InsertActivationEligibilityEventInput
): Promise<ActivationEligibilityEventRow> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      activation_id: input.activation_id,
      user_id: input.user_id,
      wallet_address: input.wallet_address,
      source: input.source,
      source_ref_id: input.source_ref_id,
      occurred_at: input.occurred_at,
      metadata: input.metadata,
    })
    .select('*')
    .single();
  if (error) {
    console.error('insertActivationEligibilityEvent:', error);
    throw new Error(error.message || 'Failed to record eligibility event');
  }
  return normalizeRow(data as Record<string, unknown>);
}

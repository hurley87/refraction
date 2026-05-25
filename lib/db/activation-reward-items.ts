import { supabase } from '@/lib/db/client';

export type ActivationRewardItemRow = {
  id: string;
  activation_id: string;
  name: string;
  hero_image_url: string | null;
  description: string | null;
  points_cost: number;
  usdc_amount: number;
  sort_order: number;
  is_active: boolean;
  max_per_user: number;
  created_at: string;
  updated_at: string;
};

const TABLE = 'activation_reward_item';

function toNumber(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return NaN;
}

function normalizeRow(row: Record<string, unknown>): ActivationRewardItemRow {
  return {
    id: String(row.id),
    activation_id: String(row.activation_id),
    name: String(row.name),
    hero_image_url:
      row.hero_image_url == null ? null : String(row.hero_image_url),
    description: row.description == null ? null : String(row.description),
    points_cost: Math.trunc(toNumber(row.points_cost)),
    usdc_amount: toNumber(row.usdc_amount),
    sort_order: Math.trunc(toNumber(row.sort_order)),
    is_active: Boolean(row.is_active),
    max_per_user: Math.trunc(toNumber(row.max_per_user)),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listActivationRewardItems(
  activationId: string
): Promise<ActivationRewardItemRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('activation_id', activationId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) {
    console.error('listActivationRewardItems:', error);
    throw new Error(error.message || 'Failed to list reward items');
  }
  return (data ?? []).map((r) => normalizeRow(r as Record<string, unknown>));
}

export async function getActivationRewardItemById(
  activationId: string,
  itemId: string
): Promise<ActivationRewardItemRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('activation_id', activationId)
    .eq('id', itemId)
    .maybeSingle();
  if (error) {
    console.error('getActivationRewardItemById:', error);
    throw new Error(error.message || 'Failed to load reward item');
  }
  if (!data) return null;
  return normalizeRow(data as Record<string, unknown>);
}

export type CreateActivationRewardItemDbInput = {
  activation_id: string;
  name: string;
  hero_image_url?: string | null;
  description?: string | null;
  points_cost: number;
  usdc_amount: number;
  sort_order: number;
  is_active: boolean;
  max_per_user: number;
};

export async function createActivationRewardItem(
  input: CreateActivationRewardItemDbInput
): Promise<ActivationRewardItemRow> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      activation_id: input.activation_id,
      name: input.name,
      hero_image_url: input.hero_image_url ?? null,
      description: input.description ?? null,
      points_cost: input.points_cost,
      usdc_amount: input.usdc_amount,
      sort_order: input.sort_order,
      is_active: input.is_active,
      max_per_user: input.max_per_user,
    })
    .select('*')
    .single();
  if (error) {
    console.error('createActivationRewardItem:', error);
    throw new Error(error.message || 'Failed to create reward item');
  }
  return normalizeRow(data as Record<string, unknown>);
}

export async function updateActivationRewardItem(
  activationId: string,
  itemId: string,
  patch: Record<string, unknown>
): Promise<ActivationRewardItemRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('activation_id', activationId)
    .eq('id', itemId)
    .select('*')
    .maybeSingle();
  if (error) {
    console.error('updateActivationRewardItem:', error);
    throw new Error(error.message || 'Failed to update reward item');
  }
  if (!data) return null;
  return normalizeRow(data as Record<string, unknown>);
}

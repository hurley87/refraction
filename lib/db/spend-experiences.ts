import { supabase } from './client';
import type { SpendExperience, SpendExperienceStatus } from '@/lib/types';

const SPEND_EXPERIENCE_COLUMNS = `
  id,
  title,
  description,
  event_id,
  status,
  points_to_usdc_rate,
  max_usdc_per_user,
  treasury_wallet_address,
  receiving_wallet_address,
  start_time,
  end_time,
  created_by,
  created_at,
  updated_at
`;

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return NaN;
};

const normalizeRow = (row: Record<string, unknown>): SpendExperience => ({
  id: String(row.id),
  title: String(row.title),
  description: row.description == null ? null : String(row.description),
  event_id: row.event_id == null ? null : String(row.event_id),
  status: row.status as SpendExperienceStatus,
  points_to_usdc_rate: toNumber(row.points_to_usdc_rate),
  max_usdc_per_user: toNumber(row.max_usdc_per_user),
  treasury_wallet_address: String(row.treasury_wallet_address),
  receiving_wallet_address: String(row.receiving_wallet_address),
  start_time: String(row.start_time),
  end_time: String(row.end_time),
  created_by: row.created_by == null ? null : String(row.created_by),
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
});

export async function listSpendExperiences(): Promise<SpendExperience[]> {
  const { data, error } = await supabase
    .from('spend_experiences')
    .select(SPEND_EXPERIENCE_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('listSpendExperiences error:', error);
    throw new Error(error.message || 'Failed to list spend experiences');
  }

  return (data || []).map((row) =>
    normalizeRow(row as Record<string, unknown>)
  );
}

export type CreateSpendExperienceInput = {
  title: string;
  description?: string | null;
  event_id?: string | null;
  status: SpendExperienceStatus;
  points_to_usdc_rate: number;
  max_usdc_per_user: number;
  treasury_wallet_address: string;
  receiving_wallet_address: string;
  start_time: string;
  end_time: string;
  created_by?: string | null;
};

export async function createSpendExperience(
  input: CreateSpendExperienceInput
): Promise<SpendExperience> {
  const insertRow = {
    title: input.title,
    description: input.description ?? null,
    event_id: input.event_id ?? null,
    status: input.status,
    points_to_usdc_rate: input.points_to_usdc_rate,
    max_usdc_per_user: input.max_usdc_per_user,
    treasury_wallet_address: input.treasury_wallet_address,
    receiving_wallet_address: input.receiving_wallet_address,
    start_time: input.start_time,
    end_time: input.end_time,
    created_by: input.created_by ?? null,
  };

  const { data, error } = await supabase
    .from('spend_experiences')
    .insert(insertRow)
    .select(SPEND_EXPERIENCE_COLUMNS)
    .single();

  if (error) {
    console.error('createSpendExperience error:', error);
    throw new Error(error.message || 'Failed to create spend experience');
  }

  return normalizeRow(data as Record<string, unknown>);
}

export type UpdateSpendExperienceInput = Partial<{
  title: string;
  description: string | null;
  event_id: string | null;
  status: SpendExperienceStatus;
  points_to_usdc_rate: number;
  max_usdc_per_user: number;
  treasury_wallet_address: string;
  receiving_wallet_address: string;
  start_time: string;
  end_time: string;
}>;

const UPDATE_SPEND_EXPERIENCE_KEYS: (keyof UpdateSpendExperienceInput)[] = [
  'title',
  'description',
  'event_id',
  'status',
  'points_to_usdc_rate',
  'max_usdc_per_user',
  'treasury_wallet_address',
  'receiving_wallet_address',
  'start_time',
  'end_time',
];

function buildSpendExperiencePatch(
  updates: UpdateSpendExperienceInput
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const key of UPDATE_SPEND_EXPERIENCE_KEYS) {
    const value = updates[key];
    if (value !== undefined) {
      patch[key] = value;
    }
  }
  return patch;
}

export async function getSpendExperienceById(
  id: string
): Promise<SpendExperience | null> {
  const { data, error } = await supabase
    .from('spend_experiences')
    .select(SPEND_EXPERIENCE_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('getSpendExperienceById error:', error);
    throw new Error(error.message || 'Failed to load spend experience');
  }

  if (!data) return null;
  return normalizeRow(data as Record<string, unknown>);
}

export async function updateSpendExperience(
  id: string,
  updates: UpdateSpendExperienceInput
): Promise<SpendExperience> {
  const patch = buildSpendExperiencePatch(updates);
  if (Object.keys(patch).length === 0) {
    throw new Error('No fields to update');
  }

  const { data, error } = await supabase
    .from('spend_experiences')
    .update(patch)
    .eq('id', id)
    .select(SPEND_EXPERIENCE_COLUMNS)
    .single();

  if (error) {
    console.error('updateSpendExperience error:', error);
    throw new Error(error.message || 'Failed to update spend experience');
  }

  return normalizeRow(data as Record<string, unknown>);
}

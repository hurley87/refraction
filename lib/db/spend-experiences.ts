import { supabase } from './client';
import type {
  SpendExperience,
  SpendExperienceStatus,
  SpendRail,
} from '@/lib/types';

const LEGACY_SPEND_EXPERIENCE_COLUMN_NAMES = [
  'id',
  'title',
  'description',
  'event_id',
  'status',
  'spend_rail',
  'points_to_usdc_rate',
  'max_usdc_per_user',
  'treasury_wallet_address',
  'receiving_wallet_address',
  'start_time',
  'end_time',
  'created_by',
  'created_at',
  'updated_at',
] as const;

const SERVER_WALLET_COLUMN_NAMES = [
  'privy_server_wallet_id',
  'server_wallet_address',
  'server_wallet_chain',
  'server_wallet_created_at',
  'spend_create_idempotency_key',
] as const;

const SPEND_EXPERIENCE_COLUMNS = [
  ...LEGACY_SPEND_EXPERIENCE_COLUMN_NAMES,
  ...SERVER_WALLET_COLUMN_NAMES,
].join(', ');

const LEGACY_SPEND_EXPERIENCE_COLUMNS =
  LEGACY_SPEND_EXPERIENCE_COLUMN_NAMES.join(', ');

type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

type SupabaseResult<T> = {
  data: T | null;
  error: SupabaseErrorLike | null;
};

const SPEND_EXPERIENCES_TABLE = 'spend_experiences';

const spendExperiencesTable = () =>
  supabase.from(SPEND_EXPERIENCES_TABLE) as ReturnType<typeof supabase.from>;

const isMissingServerWalletColumnError = (
  error: SupabaseErrorLike | null
): boolean =>
  error?.code === '42703' &&
  SERVER_WALLET_COLUMN_NAMES.some((columnName) =>
    error.message?.includes(columnName)
  );

async function runSpendExperienceRead<T>(
  operation: string,
  query: (columns: string) => PromiseLike<unknown>
): Promise<T | null> {
  const result = (await query(SPEND_EXPERIENCE_COLUMNS)) as SupabaseResult<T>;
  if (!isMissingServerWalletColumnError(result.error)) {
    if (result.error) {
      console.error(`${operation} error:`, result.error);
      throw new Error(
        result.error.message || 'Failed to load spend experience'
      );
    }
    return result.data;
  }

  console.warn(
    `${operation} retrying without server wallet columns; apply the spend_experiences server wallet migration.`
  );
  const legacyResult = (await query(
    LEGACY_SPEND_EXPERIENCE_COLUMNS
  )) as SupabaseResult<T>;
  if (legacyResult.error) {
    console.error(`${operation} error:`, legacyResult.error);
    throw new Error(
      legacyResult.error.message || 'Failed to load spend experience'
    );
  }
  return legacyResult.data;
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return NaN;
};

function normalizeSpendRail(value: unknown): SpendRail {
  if (value === 'stellar_usdc') return 'stellar_usdc';
  return 'base_usdc';
}

const normalizeRow = (row: Record<string, unknown>): SpendExperience => ({
  id: String(row.id),
  title: String(row.title),
  description: row.description == null ? null : String(row.description),
  event_id: row.event_id == null ? null : String(row.event_id),
  status: row.status as SpendExperienceStatus,
  spend_rail: normalizeSpendRail(row.spend_rail),
  points_to_usdc_rate: toNumber(row.points_to_usdc_rate),
  max_usdc_per_user: toNumber(row.max_usdc_per_user),
  treasury_wallet_address: String(row.treasury_wallet_address),
  receiving_wallet_address: String(row.receiving_wallet_address),
  privy_server_wallet_id:
    row.privy_server_wallet_id == null
      ? null
      : String(row.privy_server_wallet_id),
  server_wallet_address:
    row.server_wallet_address == null
      ? null
      : String(row.server_wallet_address),
  server_wallet_chain:
    row.server_wallet_chain == null ? null : String(row.server_wallet_chain),
  server_wallet_created_at:
    row.server_wallet_created_at == null
      ? null
      : String(row.server_wallet_created_at),
  spend_create_idempotency_key:
    row.spend_create_idempotency_key == null
      ? null
      : String(row.spend_create_idempotency_key),
  start_time: String(row.start_time),
  end_time: String(row.end_time),
  created_by: row.created_by == null ? null : String(row.created_by),
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
});

export async function listSpendExperiences(): Promise<SpendExperience[]> {
  const data = await runSpendExperienceRead<Record<string, unknown>[]>(
    'listSpendExperiences',
    (columns) =>
      spendExperiencesTable()
        .select(columns)
        .order('created_at', { ascending: false })
  );

  return (data || []).map(normalizeRow);
}

export type CreateSpendExperienceInput = {
  title: string;
  description?: string | null;
  event_id?: string | null;
  status: SpendExperienceStatus;
  spend_rail: SpendRail;
  points_to_usdc_rate: number;
  max_usdc_per_user: number;
  privy_server_wallet_id: string;
  server_wallet_address: string;
  server_wallet_chain: string;
  server_wallet_created_at: string;
  spend_create_idempotency_key: string;
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
    spend_rail: input.spend_rail,
    points_to_usdc_rate: input.points_to_usdc_rate,
    max_usdc_per_user: input.max_usdc_per_user,
    treasury_wallet_address: input.server_wallet_address,
    receiving_wallet_address: input.server_wallet_address,
    privy_server_wallet_id: input.privy_server_wallet_id,
    server_wallet_address: input.server_wallet_address,
    server_wallet_chain: input.server_wallet_chain,
    server_wallet_created_at: input.server_wallet_created_at,
    spend_create_idempotency_key: input.spend_create_idempotency_key,
    start_time: input.start_time,
    end_time: input.end_time,
    created_by: input.created_by ?? null,
  };

  const { data, error } = await spendExperiencesTable()
    .insert(insertRow)
    .select(SPEND_EXPERIENCE_COLUMNS)
    .single();

  if (error) {
    if (error.code === '23505' && input.spend_create_idempotency_key) {
      const existing = await getSpendExperienceByCreateIdempotencyKey(
        input.spend_create_idempotency_key
      );
      if (existing) return existing;
    }
    console.error('createSpendExperience error:', error);
    throw new Error(error.message || 'Failed to create spend experience');
  }

  return normalizeRow(data as unknown as Record<string, unknown>);
}

export type UpdateSpendExperienceInput = Partial<{
  title: string;
  description: string | null;
  event_id: string | null;
  status: SpendExperienceStatus;
  points_to_usdc_rate: number;
  max_usdc_per_user: number;
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
  const data = await runSpendExperienceRead<Record<string, unknown>>(
    'getSpendExperienceById',
    (columns) =>
      spendExperiencesTable().select(columns).eq('id', id).maybeSingle()
  );

  if (!data) return null;
  return normalizeRow(data as unknown as Record<string, unknown>);
}

export async function getSpendExperienceByCreateIdempotencyKey(
  idempotencyKey: string
): Promise<SpendExperience | null> {
  const data = await runSpendExperienceRead<Record<string, unknown>>(
    'getSpendExperienceByCreateIdempotencyKey',
    (columns) =>
      spendExperiencesTable()
        .select(columns)
        .eq('spend_create_idempotency_key', idempotencyKey)
        .maybeSingle()
  );

  if (!data) return null;
  return normalizeRow(data as unknown as Record<string, unknown>);
}

export async function updateSpendExperience(
  id: string,
  updates: UpdateSpendExperienceInput
): Promise<SpendExperience> {
  const patch = buildSpendExperiencePatch(updates);
  if (Object.keys(patch).length === 0) {
    throw new Error('No fields to update');
  }

  const { data, error } = await spendExperiencesTable()
    .update(patch)
    .eq('id', id)
    .select(SPEND_EXPERIENCE_COLUMNS)
    .single();

  if (error) {
    console.error('updateSpendExperience error:', error);
    throw new Error(error.message || 'Failed to update spend experience');
  }

  return normalizeRow(data as unknown as Record<string, unknown>);
}

import { supabase } from '@/lib/db/client';

export type SponsoredActivationStatus = 'draft' | 'active' | 'paused' | 'ended';

export type SettlementRail = 'base' | 'stellar';

export type SponsoredActivationRow = {
  id: string;
  slug: string;
  title: string;
  sponsor_name: string;
  event_id: string | null;
  status: SponsoredActivationStatus;
  settlement_rail: SettlementRail;
  campaign_wallet_address: string;
  venue_settlement_wallet_address: string;
  usdc_asset_config: Record<string, unknown>;
  max_redemptions: number | null;
  max_usdc_budget: number | null;
  usdc_settled_total: number;
  redemption_count_confirmed: number;
  starts_at: string;
  ends_at: string;
  eligibility_config: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  activation_create_idempotency_key: string | null;
  privy_campaign_wallet_id: string | null;
};

const TABLE = 'sponsored_activation';

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

function normalizeRow(row: Record<string, unknown>): SponsoredActivationRow {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    sponsor_name: String(row.sponsor_name),
    event_id: row.event_id == null ? null : String(row.event_id),
    status: row.status as SponsoredActivationStatus,
    settlement_rail: row.settlement_rail as SettlementRail,
    campaign_wallet_address: String(row.campaign_wallet_address),
    venue_settlement_wallet_address: String(
      row.venue_settlement_wallet_address
    ),
    usdc_asset_config:
      row.usdc_asset_config != null && typeof row.usdc_asset_config === 'object'
        ? (row.usdc_asset_config as Record<string, unknown>)
        : {},
    max_redemptions: toIntOrNull(row.max_redemptions),
    max_usdc_budget:
      row.max_usdc_budget === null || row.max_usdc_budget === undefined
        ? null
        : toNumber(row.max_usdc_budget),
    usdc_settled_total: toNumber(row.usdc_settled_total),
    redemption_count_confirmed: Math.trunc(
      toNumber(row.redemption_count_confirmed)
    ),
    starts_at: String(row.starts_at),
    ends_at: String(row.ends_at),
    eligibility_config:
      row.eligibility_config != null &&
      typeof row.eligibility_config === 'object'
        ? (row.eligibility_config as Record<string, unknown>)
        : {},
    created_by: row.created_by == null ? null : String(row.created_by),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    activation_create_idempotency_key:
      row.activation_create_idempotency_key == null
        ? null
        : String(row.activation_create_idempotency_key),
    privy_campaign_wallet_id:
      row.privy_campaign_wallet_id == null
        ? null
        : String(row.privy_campaign_wallet_id),
  };
}

export async function listSponsoredActivations(): Promise<
  SponsoredActivationRow[]
> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('listSponsoredActivations:', error);
    throw new Error(error.message || 'Failed to list sponsored activations');
  }
  return (data ?? []).map((r) => normalizeRow(r as Record<string, unknown>));
}

export async function getSponsoredActivationById(
  id: string
): Promise<SponsoredActivationRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('getSponsoredActivationById:', error);
    throw new Error(error.message || 'Failed to load sponsored activation');
  }
  if (!data) return null;
  return normalizeRow(data as Record<string, unknown>);
}

const UUID_SEGMENT =
  '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const UUID_ONLY_RE = new RegExp(`^${UUID_SEGMENT}$`);

/**
 * True when `value` is a UUID-shaped string (used to route `.../{idOrSlug}` to id vs slug lookup).
 */
export function isSponsoredActivationUuidPathSegment(value: string): boolean {
  return UUID_ONLY_RE.test(value.trim());
}

export async function getSponsoredActivationBySlug(
  slug: string
): Promise<SponsoredActivationRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('slug', slug.trim())
    .maybeSingle();
  if (error) {
    console.error('getSponsoredActivationBySlug:', error);
    throw new Error(error.message || 'Failed to load sponsored activation');
  }
  if (!data) return null;
  return normalizeRow(data as Record<string, unknown>);
}

export async function getSponsoredActivationByIdOrSlug(
  activationIdOrSlug: string
): Promise<SponsoredActivationRow | null> {
  const key = activationIdOrSlug.trim();
  if (!key) return null;
  if (isSponsoredActivationUuidPathSegment(key)) {
    return getSponsoredActivationById(key);
  }
  return getSponsoredActivationBySlug(key);
}

export async function getSponsoredActivationByCreateIdempotencyKey(
  key: string
): Promise<SponsoredActivationRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('activation_create_idempotency_key', key)
    .maybeSingle();
  if (error) {
    console.error('getSponsoredActivationByCreateIdempotencyKey:', error);
    throw new Error(
      error.message || 'Failed to load sponsored activation by idempotency key'
    );
  }
  if (!data) return null;
  return normalizeRow(data as Record<string, unknown>);
}

export async function countActivationRedemptions(
  activationId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('activation_redemption')
    .select('id', { count: 'exact', head: true })
    .eq('activation_id', activationId);
  if (error) {
    console.error('countActivationRedemptions:', error);
    throw new Error(error.message || 'Failed to count redemptions');
  }
  return count ?? 0;
}

export async function countActiveRewardItemsForActivation(
  activationId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('activation_reward_item')
    .select('id', { count: 'exact', head: true })
    .eq('activation_id', activationId)
    .eq('is_active', true);
  if (error) {
    console.error('countActiveRewardItemsForActivation:', error);
    throw new Error(error.message || 'Failed to count reward items');
  }
  return count ?? 0;
}

export type CreateSponsoredActivationDbInput = {
  slug: string;
  title: string;
  sponsor_name: string;
  event_id?: string | null;
  status: SponsoredActivationStatus;
  settlement_rail: SettlementRail;
  campaign_wallet_address: string;
  venue_settlement_wallet_address: string;
  usdc_asset_config: Record<string, unknown>;
  max_redemptions?: number | null;
  max_usdc_budget?: number | null;
  starts_at: string;
  ends_at: string;
  eligibility_config: Record<string, unknown>;
  created_by?: string | null;
  activation_create_idempotency_key: string;
  privy_campaign_wallet_id: string;
};

export async function createSponsoredActivation(
  input: CreateSponsoredActivationDbInput
): Promise<SponsoredActivationRow> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      slug: input.slug,
      title: input.title,
      sponsor_name: input.sponsor_name,
      event_id: input.event_id ?? null,
      status: input.status,
      settlement_rail: input.settlement_rail,
      campaign_wallet_address: input.campaign_wallet_address,
      venue_settlement_wallet_address: input.venue_settlement_wallet_address,
      usdc_asset_config: input.usdc_asset_config,
      max_redemptions: input.max_redemptions ?? null,
      max_usdc_budget: input.max_usdc_budget ?? null,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      eligibility_config: input.eligibility_config,
      created_by: input.created_by ?? null,
      activation_create_idempotency_key:
        input.activation_create_idempotency_key,
      privy_campaign_wallet_id: input.privy_campaign_wallet_id,
    })
    .select('*')
    .single();
  if (error) {
    if (
      (error as { code?: string }).code === '23505' &&
      input.activation_create_idempotency_key
    ) {
      const existing = await getSponsoredActivationByCreateIdempotencyKey(
        input.activation_create_idempotency_key
      );
      if (existing) return existing;
    }
    console.error('createSponsoredActivation:', error);
    throw new Error(error.message || 'Failed to create sponsored activation');
  }
  return normalizeRow(data as Record<string, unknown>);
}

export async function updateSponsoredActivation(
  id: string,
  patch: Record<string, unknown>
): Promise<SponsoredActivationRow | null> {
  const safePatch = { ...patch };
  delete safePatch.usdc_settled_total;
  delete safePatch.redemption_count_confirmed;

  const { data, error } = await supabase
    .from(TABLE)
    .update(safePatch)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) {
    console.error('updateSponsoredActivation:', error);
    throw new Error(error.message || 'Failed to update sponsored activation');
  }
  if (!data) return null;
  return normalizeRow(data as Record<string, unknown>);
}

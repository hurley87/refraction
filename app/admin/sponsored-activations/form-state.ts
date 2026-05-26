import type { SettlementRail } from '@/lib/db/sponsored-activations';
import type { AdminCreateSponsoredActivationRequest } from '@/lib/schemas/sponsored-activation';

/** Mainnet Base USDC — same default as `SPEND_RAIL_BASE_USDC_USDC_CONTRACT` in `.env.local.example`. */
export const DEFAULT_BASE_USDC_CONTRACT =
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export type SponsoredActivationFormState = {
  slug: string;
  title: string;
  sponsor_name: string;
  event_id: string;
  settlement_rail: SettlementRail;
  venue_settlement_wallet_address: string;
  base_usdc_contract: string;
  stellar_asset_code: string;
  stellar_usdc_issuer: string;
  max_redemptions: string;
  max_usdc_budget: string;
  starts_at_local: string;
  ends_at_local: string;
  max_events_per_user: string;
  max_events_per_user_per_day: string;
  required_checkpoint_ids: string;
  min_tier: string;
};

export function isoToDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function datetimeLocalToIso(value: string): string {
  return new Date(value).toISOString();
}

function defaultWindow(): { start: string; end: string } {
  const start = new Date();
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function emptySponsoredActivationForm(): SponsoredActivationFormState {
  const { start, end } = defaultWindow();
  return {
    slug: '',
    title: '',
    sponsor_name: '',
    event_id: '',
    settlement_rail: 'base',
    venue_settlement_wallet_address: '',
    base_usdc_contract: DEFAULT_BASE_USDC_CONTRACT,
    stellar_asset_code: 'USDC',
    stellar_usdc_issuer: '',
    max_redemptions: '100',
    max_usdc_budget: '',
    starts_at_local: isoToDatetimeLocalValue(start),
    ends_at_local: isoToDatetimeLocalValue(end),
    max_events_per_user: '50',
    max_events_per_user_per_day: '10',
    required_checkpoint_ids: '',
    min_tier: '',
  };
}

function parsePositiveIntField(
  raw: string,
  fieldLabel: string
): number | null | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${fieldLabel} must be a positive whole number`);
  }
  return n;
}

function parseOptionalPositiveDecimal(
  raw: string,
  fieldLabel: string
): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${fieldLabel} must be a positive number`);
  }
  return n;
}

/** Builds the admin POST body from panel form state. */
export function formStateToCreatePayload(
  form: SponsoredActivationFormState
): AdminCreateSponsoredActivationRequest {
  const slug = form.slug.trim();
  const title = form.title.trim();
  const sponsor_name = form.sponsor_name.trim();
  if (!slug) throw new Error('Slug is required');
  if (!title) throw new Error('Title is required');
  if (!sponsor_name) throw new Error('Sponsor name is required');

  const venue = form.venue_settlement_wallet_address.trim();
  if (!venue) throw new Error('Venue settlement wallet is required');

  const max_redemptions = parsePositiveIntField(
    form.max_redemptions,
    'Max redemptions'
  );
  const max_usdc_budget = parseOptionalPositiveDecimal(
    form.max_usdc_budget,
    'Max USDC budget'
  );
  if (max_redemptions == null && max_usdc_budget == null) {
    throw new Error('Set max redemptions and/or max USDC budget');
  }

  const checkpointIds = form.required_checkpoint_ids
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (checkpointIds.length === 0) {
    throw new Error('At least one required checkpoint ID is needed');
  }

  const max_events_per_user = parsePositiveIntField(
    form.max_events_per_user,
    'Max events per user'
  );
  const max_events_per_user_per_day = parsePositiveIntField(
    form.max_events_per_user_per_day,
    'Max events per user per day'
  );
  if (max_events_per_user == null || max_events_per_user_per_day == null) {
    throw new Error('Eligibility event caps are required');
  }

  const minTierRaw = form.min_tier.trim();
  let min_tier: number | undefined;
  if (minTierRaw) {
    const n = Number(minTierRaw);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error('Min tier must be a positive whole number');
    }
    min_tier = n;
  }

  const eligibility_config = {
    max_events_per_user,
    max_events_per_user_per_day,
    required_checkpoint_ids: checkpointIds,
    ...(min_tier != null ? { min_tier } : {}),
  };

  const common = {
    slug,
    title,
    sponsor_name,
    event_id: form.event_id.trim() || null,
    max_redemptions: max_redemptions ?? null,
    max_usdc_budget,
    starts_at: datetimeLocalToIso(form.starts_at_local),
    ends_at: datetimeLocalToIso(form.ends_at_local),
    eligibility_config,
  };

  if (form.settlement_rail === 'base') {
    const contract = form.base_usdc_contract.trim();
    if (!contract) throw new Error('Base USDC contract address is required');
    return {
      ...common,
      settlement_rail: 'base',
      venue_settlement_wallet_address: venue,
      usdc_asset_config: { contract_address: contract },
    } as AdminCreateSponsoredActivationRequest;
  }

  const asset_code = form.stellar_asset_code.trim();
  const issuer = form.stellar_usdc_issuer.trim();
  if (!asset_code) throw new Error('Stellar asset code is required');
  if (!issuer) throw new Error('Stellar USDC issuer is required');

  return {
    ...common,
    settlement_rail: 'stellar',
    venue_settlement_wallet_address: venue,
    usdc_asset_config: { asset_code, issuer },
  } as AdminCreateSponsoredActivationRequest;
}

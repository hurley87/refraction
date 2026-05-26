import type { SettlementRail } from '@/lib/db/sponsored-activations';
import type { AdminCreateSponsoredActivationRequest } from '@/lib/schemas/sponsored-activation';
import { DEFAULT_SPONSORED_ACTIVATION_ELIGIBILITY_CONFIG } from '@/lib/schemas/activation-eligibility-config';

export type SponsoredActivationFormState = {
  title: string;
  sponsor_name: string;
  event_id: string;
  settlement_rail: SettlementRail;
  venue_settlement_wallet_address: string;
  stellar_asset_code: string;
  stellar_usdc_issuer: string;
  max_redemptions: string;
  max_usdc_budget: string;
  starts_at_local: string;
  ends_at_local: string;
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
    title: '',
    sponsor_name: '',
    event_id: '',
    settlement_rail: 'base',
    venue_settlement_wallet_address: '',
    stellar_asset_code: 'USDC',
    stellar_usdc_issuer: '',
    max_redemptions: '100',
    max_usdc_budget: '',
    starts_at_local: isoToDatetimeLocalValue(start),
    ends_at_local: isoToDatetimeLocalValue(end),
  };
}

function parsePositiveIntField(
  raw: string,
  fieldLabel: string
): number | undefined {
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
  const title = form.title.trim();
  const sponsor_name = form.sponsor_name.trim();
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

  const common = {
    title,
    sponsor_name,
    event_id: form.event_id.trim() || null,
    max_redemptions: max_redemptions ?? null,
    max_usdc_budget,
    starts_at: datetimeLocalToIso(form.starts_at_local),
    ends_at: datetimeLocalToIso(form.ends_at_local),
    eligibility_config: DEFAULT_SPONSORED_ACTIVATION_ELIGIBILITY_CONFIG,
  };

  if (form.settlement_rail === 'base') {
    return {
      ...common,
      settlement_rail: 'base',
      venue_settlement_wallet_address: venue,
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

import { normalizeSpendRail } from './spend-rail';
import type {
  PointConversion,
  PointConversionLastFailure,
  SpendSession,
  SpendTransaction,
} from '@/lib/types';

/** Columns shared by `spend_sessions` reads in spend pilot DB helpers. */
export const SESSION_COLS = `
  id,
  spend_experience_id,
  user_id,
  wallet_address,
  spend_rail,
  rail_user_wallet_address,
  status,
  qr_token_hash,
  created_at,
  expires_at,
  completed_at
`;

/**
 * `point_conversions` columns available before IRL-17 retry-audit fields
 * (`database/point-conversions-retry-metadata.sql`). Prefer
 * {@link fetchPointConversionWithSelectFallback} for reads so older DBs still work.
 */
export const CONVERSION_COLS_WITHOUT_RETRY_AUDIT = `
  id,
  spend_experience_id,
  spend_session_id,
  user_id,
  points_deducted,
  usdc_amount,
  status,
  spend_rail,
  network,
  asset_symbol,
  treasury_wallet_address,
  user_wallet_address,
  funding_tx_hash,
  explorer_tx_url,
  idempotency_key,
  created_at,
  completed_at,
  failed_reason,
  updated_at
`.trim();

/** Full `point_conversions` read including IRL-17 retry audit columns when present. */
export const CONVERSION_COLS_WITH_RETRY_AUDIT = `${CONVERSION_COLS_WITHOUT_RETRY_AUDIT},
  conversion_attempt_count,
  conversion_last_failure`;

/** @deprecated Prefer {@link fetchPointConversionWithSelectFallback} instead of selecting this list directly. */
export const CONVERSION_COLS = CONVERSION_COLS_WITH_RETRY_AUDIT;

type PgLikeError = { code?: string; message?: string } | null | undefined;

/** PostgreSQL `undefined_column` (e.g. missing IRL-17 migration). */
export function isMissingPointConversionRetryAuditDbError(
  error: PgLikeError
): boolean {
  if (!error || String(error.code) !== '42703') return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    msg.includes('conversion_attempt_count') ||
    msg.includes('conversion_last_failure')
  );
}

let pointConversionRetryAuditSelectEnabled = true;

function pointConversionSelectColumnsForNextQuery(): string {
  return pointConversionRetryAuditSelectEnabled
    ? CONVERSION_COLS_WITH_RETRY_AUDIT
    : CONVERSION_COLS_WITHOUT_RETRY_AUDIT;
}

type PointConversionQueryResult = { data: unknown; error: PgLikeError };

/**
 * Normalizes PostgREST array results from {@link fetchPointConversionWithSelectFallback}.
 */
export function pointConversionRowsFromSelectData(
  data: unknown
): Record<string, unknown>[] {
  if (!Array.isArray(data)) return [];
  return data as Record<string, unknown>[];
}

/**
 * Runs a `point_conversions` PostgREST call with the broadest column list, then
 * retries without IRL-17 retry-audit columns if the DB has not applied that migration.
 */
export async function fetchPointConversionWithSelectFallback(
  run: (columns: string) => PromiseLike<PointConversionQueryResult>
): Promise<PointConversionQueryResult> {
  const first = await run(pointConversionSelectColumnsForNextQuery());
  if (!first.error || !isMissingPointConversionRetryAuditDbError(first.error)) {
    return first;
  }
  pointConversionRetryAuditSelectEnabled = false;
  return run(pointConversionSelectColumnsForNextQuery());
}

export const SPEND_TX_COLS = `
  id,
  spend_experience_id,
  spend_session_id,
  user_id,
  usdc_amount,
  spend_rail,
  network,
  asset_symbol,
  from_wallet_address,
  to_wallet_address,
  status,
  payment_tx_hash,
  explorer_tx_url,
  idempotency_key,
  created_at,
  completed_at,
  failed_reason,
  updated_at
`;

export function toNum(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return NaN;
}

export function rowToSession(row: Record<string, unknown>): SpendSession {
  return {
    id: String(row.id),
    spend_experience_id: String(row.spend_experience_id),
    user_id: String(row.user_id),
    wallet_address: String(row.wallet_address),
    spend_rail: normalizeSpendRail(row.spend_rail),
    rail_user_wallet_address:
      row.rail_user_wallet_address == null
        ? null
        : String(row.rail_user_wallet_address),
    status: row.status as SpendSession['status'],
    qr_token_hash: row.qr_token_hash == null ? null : String(row.qr_token_hash),
    created_at: String(row.created_at),
    expires_at: String(row.expires_at),
    completed_at: row.completed_at == null ? null : String(row.completed_at),
  };
}

export function rowToSpendTransaction(
  row: Record<string, unknown>
): SpendTransaction {
  return {
    id: String(row.id),
    spend_experience_id: String(row.spend_experience_id),
    spend_session_id: String(row.spend_session_id),
    user_id: String(row.user_id),
    usdc_amount: toNum(row.usdc_amount),
    spend_rail: normalizeSpendRail(row.spend_rail),
    network: row.network == null ? 'Base' : String(row.network),
    asset_symbol: row.asset_symbol == null ? 'USDC' : String(row.asset_symbol),
    from_wallet_address: String(row.from_wallet_address),
    to_wallet_address: String(row.to_wallet_address),
    status: row.status as SpendTransaction['status'],
    payment_tx_hash:
      row.payment_tx_hash == null ? null : String(row.payment_tx_hash),
    explorer_tx_url:
      row.explorer_tx_url == null ? null : String(row.explorer_tx_url),
    idempotency_key:
      row.idempotency_key == null ? null : String(row.idempotency_key),
    created_at: String(row.created_at),
    completed_at: row.completed_at == null ? null : String(row.completed_at),
    failed_reason: row.failed_reason == null ? null : String(row.failed_reason),
    updated_at:
      row.updated_at == null ? String(row.created_at) : String(row.updated_at),
  };
}

function rowToConversionLastFailure(
  raw: unknown
): PointConversionLastFailure | null {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const recordedAt = o.recorded_at;
  const phase = o.phase;
  const category = o.category;
  const reasonSnippet = o.reason_snippet;
  if (
    typeof recordedAt !== 'string' ||
    (phase !== 'readiness' && phase !== 'funding' && phase !== 'resume') ||
    typeof category !== 'string' ||
    typeof reasonSnippet !== 'string'
  ) {
    return null;
  }
  return {
    recorded_at: recordedAt,
    phase,
    category,
    reason_snippet: reasonSnippet,
    ...(o.internal_diagnostics &&
    typeof o.internal_diagnostics === 'object' &&
    !Array.isArray(o.internal_diagnostics)
      ? {
          internal_diagnostics: o.internal_diagnostics as Record<
            string,
            unknown
          >,
        }
      : {}),
  };
}

export function rowToConversion(row: Record<string, unknown>): PointConversion {
  const attemptRaw = row.conversion_attempt_count;
  const attemptCount =
    typeof attemptRaw === 'number' && Number.isFinite(attemptRaw)
      ? attemptRaw
      : typeof attemptRaw === 'string'
        ? Number(attemptRaw)
        : 1;

  return {
    id: String(row.id),
    spend_experience_id: String(row.spend_experience_id),
    spend_session_id: String(row.spend_session_id),
    user_id: String(row.user_id),
    points_deducted: toNum(row.points_deducted),
    usdc_amount: toNum(row.usdc_amount),
    status: row.status as PointConversion['status'],
    spend_rail: normalizeSpendRail(row.spend_rail),
    network: row.network == null ? 'Base' : String(row.network),
    asset_symbol: row.asset_symbol == null ? 'USDC' : String(row.asset_symbol),
    treasury_wallet_address: String(row.treasury_wallet_address),
    user_wallet_address: String(row.user_wallet_address),
    funding_tx_hash:
      row.funding_tx_hash == null ? null : String(row.funding_tx_hash),
    explorer_tx_url:
      row.explorer_tx_url == null ? null : String(row.explorer_tx_url),
    idempotency_key:
      row.idempotency_key == null ? null : String(row.idempotency_key),
    conversion_attempt_count:
      Number.isFinite(attemptCount) && attemptCount >= 1 ? attemptCount : 1,
    conversion_last_failure: rowToConversionLastFailure(
      row.conversion_last_failure
    ),
    created_at: String(row.created_at),
    completed_at: row.completed_at == null ? null : String(row.completed_at),
    failed_reason: row.failed_reason == null ? null : String(row.failed_reason),
    updated_at:
      row.updated_at == null ? String(row.created_at) : String(row.updated_at),
  };
}

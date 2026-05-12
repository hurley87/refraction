import { normalizeSpendRail } from './spend-rail';
import type {
  PointConversion,
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

export const CONVERSION_COLS = `
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
`;

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

export function rowToConversion(row: Record<string, unknown>): PointConversion {
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
    created_at: String(row.created_at),
    completed_at: row.completed_at == null ? null : String(row.completed_at),
    failed_reason: row.failed_reason == null ? null : String(row.failed_reason),
    updated_at:
      row.updated_at == null ? String(row.created_at) : String(row.updated_at),
  };
}

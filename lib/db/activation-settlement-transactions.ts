import { supabase } from '@/lib/db/client';
import type { ActivationSettlementStatus } from '@/lib/schemas/activation-settlement';
import type { SettlementRail } from '@/lib/db/sponsored-activations';

const TABLE = 'activation_settlement_transaction';

export type ActivationSettlementTransactionRow = {
  id: string;
  redemption_id: string;
  activation_id: string;
  settlement_rail: SettlementRail;
  status: ActivationSettlementStatus;
  amount: number;
  from_wallet_address: string;
  to_wallet_address: string;
  tx_hash: string | null;
  submission_attempt: number;
  last_error_code: string | null;
  queued_at: string | null;
  submitted_at: string | null;
  confirmed_at: string | null;
  privy_transaction_id: string | null;
};

function toNumber(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return NaN;
}

function toInt(value: unknown): number {
  const n = toNumber(value);
  return Number.isNaN(n) ? 0 : Math.trunc(n);
}

function normalizeRow(
  row: Record<string, unknown>
): ActivationSettlementTransactionRow {
  return {
    id: String(row.id),
    redemption_id: String(row.redemption_id),
    activation_id: String(row.activation_id),
    settlement_rail: row.settlement_rail as SettlementRail,
    status: row.status as ActivationSettlementStatus,
    amount: toNumber(row.amount),
    from_wallet_address: String(row.from_wallet_address),
    to_wallet_address: String(row.to_wallet_address),
    tx_hash: row.tx_hash == null ? null : String(row.tx_hash),
    submission_attempt: toInt(row.submission_attempt),
    last_error_code:
      row.last_error_code == null ? null : String(row.last_error_code),
    queued_at: row.queued_at == null ? null : String(row.queued_at),
    submitted_at: row.submitted_at == null ? null : String(row.submitted_at),
    confirmed_at: row.confirmed_at == null ? null : String(row.confirmed_at),
    privy_transaction_id:
      row.privy_transaction_id == null
        ? null
        : String(row.privy_transaction_id),
  };
}

export async function getActivationSettlementTransactionByRedemptionId(
  redemptionId: string
): Promise<ActivationSettlementTransactionRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('redemption_id', redemptionId)
    .maybeSingle();

  if (error) {
    console.error('getActivationSettlementTransactionByRedemptionId:', error);
    throw new Error(error.message || 'Failed to load settlement transaction');
  }
  if (!data) return null;
  return normalizeRow(data as Record<string, unknown>);
}

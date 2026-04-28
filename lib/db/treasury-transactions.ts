import { supabase } from './client';
import type { TreasuryTransaction } from '@/lib/types';

const TREASURY_COLS = `
  id,
  spend_experience_id,
  transaction_type,
  amount,
  from_wallet_address,
  to_wallet_address,
  tx_hash,
  status,
  created_at
`;

function rowToTreasury(row: Record<string, unknown>): TreasuryTransaction {
  return {
    id: String(row.id),
    spend_experience_id:
      row.spend_experience_id == null ? null : String(row.spend_experience_id),
    transaction_type:
      row.transaction_type as TreasuryTransaction['transaction_type'],
    amount:
      typeof row.amount === 'number' ? row.amount : Number(row.amount ?? NaN),
    from_wallet_address:
      row.from_wallet_address == null ? null : String(row.from_wallet_address),
    to_wallet_address:
      row.to_wallet_address == null ? null : String(row.to_wallet_address),
    tx_hash: row.tx_hash == null ? null : String(row.tx_hash),
    status: row.status as TreasuryTransaction['status'],
    created_at: String(row.created_at),
  };
}

/**
 * Optional audit row for treasury → user USDC (matches `point_conversions.funding_tx_hash` when confirmed).
 */
export async function insertTreasuryFundUserLedgerIfAbsent(input: {
  spendExperienceId: string;
  amount: number;
  fromWalletAddress: string;
  toWalletAddress: string;
  txHash: string;
}): Promise<void> {
  const txLower = input.txHash.trim().toLowerCase();
  const { data: existing } = await supabase
    .from('treasury_transactions')
    .select('id')
    .eq('spend_experience_id', input.spendExperienceId)
    .eq('transaction_type', 'fund_user')
    .eq('tx_hash', txLower)
    .maybeSingle();

  if (existing) return;

  const { error } = await supabase.from('treasury_transactions').insert({
    spend_experience_id: input.spendExperienceId,
    transaction_type: 'fund_user',
    amount: input.amount,
    from_wallet_address: input.fromWalletAddress.trim().toLowerCase(),
    to_wallet_address: input.toWalletAddress.trim().toLowerCase(),
    tx_hash: txLower,
    status: 'confirmed',
  });

  if (error) {
    console.error('insertTreasuryFundUserLedgerIfAbsent:', error);
  }
}

/**
 * Optional audit row for user → receiving wallet USDC (matches `spend_transactions.payment_tx_hash` when confirmed).
 */
export async function insertTreasuryReceivePaymentLedgerIfAbsent(input: {
  spendExperienceId: string;
  amount: number;
  fromWalletAddress: string;
  toWalletAddress: string;
  txHash: string;
}): Promise<void> {
  const txLower = input.txHash.trim().toLowerCase();
  const { data: existing } = await supabase
    .from('treasury_transactions')
    .select('id')
    .eq('spend_experience_id', input.spendExperienceId)
    .eq('transaction_type', 'receive_payment')
    .eq('tx_hash', txLower)
    .maybeSingle();

  if (existing) return;

  const { error } = await supabase.from('treasury_transactions').insert({
    spend_experience_id: input.spendExperienceId,
    transaction_type: 'receive_payment',
    amount: input.amount,
    from_wallet_address: input.fromWalletAddress.trim().toLowerCase(),
    to_wallet_address: input.toWalletAddress.trim().toLowerCase(),
    tx_hash: txLower,
    status: 'confirmed',
  });

  if (error) {
    console.error('insertTreasuryReceivePaymentLedgerIfAbsent:', error);
  }
}

export async function listTreasuryTransactionsForExperience(
  spendExperienceId: string,
  limit = 500
): Promise<TreasuryTransaction[]> {
  const { data, error } = await supabase
    .from('treasury_transactions')
    .select(TREASURY_COLS)
    .eq('spend_experience_id', spendExperienceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('listTreasuryTransactionsForExperience:', error);
    throw new Error(error.message || 'Failed to load treasury ledger');
  }
  return (data ?? []).map((row) =>
    rowToTreasury(row as Record<string, unknown>)
  );
}

import { supabase } from './client';
import { normalizeSpendRail } from './spend-rail';
import {
  explorerTxUrlForSpendLedger,
  spendLedgerNetworkLabel,
} from '@/lib/spend-ledger-explorer-url';
import type { SpendRail, TreasuryTransaction } from '@/lib/types';

const TREASURY_COLS = `
  id,
  spend_experience_id,
  transaction_type,
  amount,
  spend_rail,
  network,
  asset_symbol,
  from_wallet_address,
  to_wallet_address,
  tx_hash,
  explorer_tx_url,
  status,
  created_at,
  updated_at
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
    spend_rail: normalizeSpendRail(row.spend_rail),
    network: row.network == null ? 'Base' : String(row.network),
    asset_symbol: row.asset_symbol == null ? 'USDC' : String(row.asset_symbol),
    from_wallet_address:
      row.from_wallet_address == null ? null : String(row.from_wallet_address),
    to_wallet_address:
      row.to_wallet_address == null ? null : String(row.to_wallet_address),
    tx_hash: row.tx_hash == null ? null : String(row.tx_hash),
    explorer_tx_url:
      row.explorer_tx_url == null ? null : String(row.explorer_tx_url),
    status: row.status as TreasuryTransaction['status'],
    created_at: String(row.created_at),
    updated_at:
      row.updated_at == null ? String(row.created_at) : String(row.updated_at),
  };
}

type TreasuryLedgerInsertType = Extract<
  TreasuryTransaction['transaction_type'],
  'fund_user' | 'receive_payment' | 'admin_recovery'
>;

async function insertTreasuryLedgerRowIfAbsent(params: {
  spendExperienceId: string;
  spendRail: SpendRail;
  transactionType: TreasuryLedgerInsertType;
  amount: number;
  fromWalletAddress: string;
  toWalletAddress: string;
  txHash: string;
}): Promise<void> {
  const txLower = params.txHash.trim().toLowerCase();
  const { data: existing } = await supabase
    .from('treasury_transactions')
    .select('id')
    .eq('spend_experience_id', params.spendExperienceId)
    .eq('transaction_type', params.transactionType)
    .eq('tx_hash', txLower)
    .maybeSingle();

  if (existing) return;

  const spend_rail = params.spendRail;
  const explorerTxUrl = explorerTxUrlForSpendLedger(spend_rail, txLower);

  const { error } = await supabase.from('treasury_transactions').insert({
    spend_experience_id: params.spendExperienceId,
    transaction_type: params.transactionType,
    amount: params.amount,
    spend_rail,
    network: spendLedgerNetworkLabel(spend_rail),
    asset_symbol: 'USDC',
    from_wallet_address: params.fromWalletAddress.trim().toLowerCase(),
    to_wallet_address: params.toWalletAddress.trim().toLowerCase(),
    tx_hash: txLower,
    explorer_tx_url: explorerTxUrl,
    status: 'confirmed',
  });

  if (error) {
    console.error(
      `insertTreasuryLedgerRowIfAbsent (${params.transactionType}):`,
      error
    );
  }
}

/** Optional audit row: treasury → user USDC (matches funded `point_conversions.funding_tx_hash`). */
export function insertTreasuryFundUserLedgerIfAbsent(input: {
  spendExperienceId: string;
  spendRail: SpendRail;
  amount: number;
  fromWalletAddress: string;
  toWalletAddress: string;
  txHash: string;
}): Promise<void> {
  return insertTreasuryLedgerRowIfAbsent({
    spendExperienceId: input.spendExperienceId,
    spendRail: input.spendRail,
    transactionType: 'fund_user',
    amount: input.amount,
    fromWalletAddress: input.fromWalletAddress,
    toWalletAddress: input.toWalletAddress,
    txHash: input.txHash,
  });
}

/** Optional audit row: user → event wallet USDC (matches confirmed `spend_transactions.payment_tx_hash`). */
export function insertTreasuryReceivePaymentLedgerIfAbsent(input: {
  spendExperienceId: string;
  spendRail: SpendRail;
  amount: number;
  fromWalletAddress: string;
  toWalletAddress: string;
  txHash: string;
}): Promise<void> {
  return insertTreasuryLedgerRowIfAbsent({
    spendExperienceId: input.spendExperienceId,
    spendRail: input.spendRail,
    transactionType: 'receive_payment',
    amount: input.amount,
    fromWalletAddress: input.fromWalletAddress,
    toWalletAddress: input.toWalletAddress,
    txHash: input.txHash,
  });
}

/** Optional audit row: admin withdrawal from server wallet to an external address. */
export function insertTreasuryAdminRecoveryLedgerIfAbsent(input: {
  spendExperienceId: string;
  spendRail: SpendRail;
  amount: number;
  fromWalletAddress: string;
  toWalletAddress: string;
  txHash: string;
}): Promise<void> {
  return insertTreasuryLedgerRowIfAbsent({
    spendExperienceId: input.spendExperienceId,
    spendRail: input.spendRail,
    transactionType: 'admin_recovery',
    amount: input.amount,
    fromWalletAddress: input.fromWalletAddress,
    toWalletAddress: input.toWalletAddress,
    txHash: input.txHash,
  });
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

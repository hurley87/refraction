import type {
  SpendWalletReadinessClientDto,
  SpendWalletReadinessOperation,
} from '@/lib/types';

/** Maps a full readiness row to fields safe to return to HTTP clients. */
export function toSpendWalletReadinessClientDto(
  op: SpendWalletReadinessOperation
): SpendWalletReadinessClientDto {
  const raw = op.step_metadata.current_step;
  const current_step =
    typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;

  return {
    id: op.id,
    status: op.status,
    rail_user_wallet_address: op.rail_user_wallet_address,
    sanitized_error_category: op.sanitized_error_category,
    sanitized_error_code: op.sanitized_error_code,
    current_step,
    sponsor_treasury_transaction_id: op.sponsor_treasury_transaction_id,
    trustline_treasury_transaction_id: op.trustline_treasury_transaction_id,
    created_at: op.created_at,
    updated_at: op.updated_at,
  };
}

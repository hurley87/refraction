import type {
  SpendWalletReadinessClientDto,
  SpendWalletReadinessOperation,
} from '@/lib/types';

function currentStepFromStepMetadata(
  stepMetadata: Record<string, unknown>
): string | null {
  const raw = stepMetadata.current_step;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw;
  }
  return null;
}

/** Maps a full readiness row to fields safe to return to HTTP clients. */
export function toSpendWalletReadinessClientDto(
  op: SpendWalletReadinessOperation
): SpendWalletReadinessClientDto {
  return {
    id: op.id,
    status: op.status,
    rail_user_wallet_address: op.rail_user_wallet_address,
    sanitized_error_category: op.sanitized_error_category,
    sanitized_error_code: op.sanitized_error_code,
    current_step: currentStepFromStepMetadata(op.step_metadata),
    sponsor_treasury_transaction_id: op.sponsor_treasury_transaction_id,
    trustline_treasury_transaction_id: op.trustline_treasury_transaction_id,
    created_at: op.created_at,
    updated_at: op.updated_at,
  };
}

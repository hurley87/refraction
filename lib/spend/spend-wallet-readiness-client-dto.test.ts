import { describe, it, expect } from 'vitest';
import { toSpendWalletReadinessClientDto } from './spend-wallet-readiness-client-dto';
import type { SpendWalletReadinessOperation } from '@/lib/types';

const baseOp: SpendWalletReadinessOperation = {
  id: 'wro-1',
  spend_session_id: 'sess-1',
  user_id: 'u1',
  spend_rail: 'stellar_usdc',
  rail_user_wallet_address:
    'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
  status: 'pending',
  step_metadata: {
    current_step: 'trustline_confirming',
    server_only_detail: { x: 1 },
  },
  sanitized_error_category: null,
  sanitized_error_code: null,
  internal_diagnostics: { raw_horizon: 'secret' },
  idempotency_key: 'wallet_readiness:sess-1',
  sponsor_treasury_transaction_id: 'sp-1',
  trustline_treasury_transaction_id: 'tl-1',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:01:00.000Z',
};

describe('toSpendWalletReadinessClientDto', () => {
  it('drops internal_diagnostics and raw step_metadata; exposes current_step', () => {
    const dto = toSpendWalletReadinessClientDto(baseOp);
    expect(dto).toEqual({
      id: 'wro-1',
      status: 'pending',
      rail_user_wallet_address: baseOp.rail_user_wallet_address,
      sanitized_error_category: null,
      sanitized_error_code: null,
      current_step: 'trustline_confirming',
      sponsor_treasury_transaction_id: 'sp-1',
      trustline_treasury_transaction_id: 'tl-1',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:01:00.000Z',
    });
    expect(dto).not.toHaveProperty('internal_diagnostics');
    expect(dto).not.toHaveProperty('step_metadata');
  });

  it('returns null current_step when missing or non-string', () => {
    expect(
      toSpendWalletReadinessClientDto({
        ...baseOp,
        step_metadata: {},
      }).current_step
    ).toBeNull();
    expect(
      toSpendWalletReadinessClientDto({
        ...baseOp,
        step_metadata: { current_step: 123 },
      }).current_step
    ).toBeNull();
  });

  it('trims whitespace from current_step', () => {
    expect(
      toSpendWalletReadinessClientDto({
        ...baseOp,
        step_metadata: { current_step: '  trustline_confirming  ' },
      }).current_step
    ).toBe('trustline_confirming');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSingle, mockMaybeSingle, mockFrom, mockInsert } = vi.hoisted(() => {
  const single = vi.fn();
  const maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
  const queryBuilder = {
    select: vi.fn(() => queryBuilder),
    eq: vi.fn(() => queryBuilder),
    maybeSingle,
    single,
  };

  const insert = vi.fn(() => ({
    select: vi.fn(() => ({ single })),
  }));

  const from = vi.fn(() => ({
    ...queryBuilder,
    insert,
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({ single })),
      })),
    })),
  }));

  return {
    mockSingle: single,
    mockMaybeSingle: maybeSingle,
    mockFrom: from,
    mockInsert: insert,
  };
});

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  getSpendWalletReadinessByIdempotencyKey,
  insertPendingSpendWalletReadinessOrGet,
  spendWalletReadinessIdempotencyKey,
} from '../spend-wallet-readiness';

const sessionId = '770e8400-e29b-41d4-a716-446655440000';
const readinessRow = {
  id: '880e8400-e29b-41d4-a716-446655440001',
  spend_session_id: sessionId,
  user_id: 'user-1',
  spend_rail: 'stellar_usdc',
  rail_user_wallet_address:
    'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
  status: 'pending',
  step_metadata: {},
  sanitized_error_category: null,
  sanitized_error_code: null,
  internal_diagnostics: null,
  idempotency_key: spendWalletReadinessIdempotencyKey(sessionId),
  sponsor_treasury_transaction_id: null,
  trustline_treasury_transaction_id: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('spendWalletReadinessIdempotencyKey', () => {
  it('uses the v1 wallet_readiness prefix', () => {
    expect(spendWalletReadinessIdempotencyKey(sessionId)).toBe(
      `wallet_readiness:${sessionId}`
    );
  });
});

describe('insertPendingSpendWalletReadinessOrGet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows NULL rail_user_wallet_address on insert for pending Stellar readiness', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { ...readinessRow, rail_user_wallet_address: null },
      error: null,
    });

    const result = await insertPendingSpendWalletReadinessOrGet({
      spendSessionId: sessionId,
      userId: 'user-1',
      spendRail: 'stellar_usdc',
      railUserWalletAddress: null,
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        rail_user_wallet_address: null,
        spend_session_id: sessionId,
      })
    );
    expect(result.row.rail_user_wallet_address).toBeNull();
  });

  it('returns created row on first insert', async () => {
    mockSingle.mockResolvedValueOnce({ data: readinessRow, error: null });

    const result = await insertPendingSpendWalletReadinessOrGet({
      spendSessionId: sessionId,
      userId: 'user-1',
      spendRail: 'stellar_usdc',
      railUserWalletAddress: readinessRow.rail_user_wallet_address,
    });

    expect(mockFrom).toHaveBeenCalledWith('spend_wallet_readiness_operations');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        spend_session_id: sessionId,
        idempotency_key: spendWalletReadinessIdempotencyKey(sessionId),
      })
    );
    expect(result.created).toBe(true);
    expect(result.row.id).toBe(readinessRow.id);
    expect(result.row.idempotency_key).toBe(
      spendWalletReadinessIdempotencyKey(sessionId)
    );
  });

  it('returns existing row when idempotency unique constraint fires', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: '23505', message: 'duplicate key value' },
    });
    mockMaybeSingle.mockResolvedValueOnce({
      data: readinessRow,
      error: null,
    });

    const result = await insertPendingSpendWalletReadinessOrGet({
      spendSessionId: sessionId,
      userId: 'user-1',
      spendRail: 'stellar_usdc',
      railUserWalletAddress: readinessRow.rail_user_wallet_address,
    });

    expect(result.created).toBe(false);
    expect(result.row).toEqual(
      expect.objectContaining({
        id: readinessRow.id,
        spend_session_id: sessionId,
      })
    );
  });
});

describe('getSpendWalletReadinessByIdempotencyKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps DB row to SpendWalletReadinessOperation', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: readinessRow,
      error: null,
    });
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle }),
      }),
    });

    const row = await getSpendWalletReadinessByIdempotencyKey(
      spendWalletReadinessIdempotencyKey(sessionId)
    );

    expect(row?.spend_rail).toBe('stellar_usdc');
    expect(row?.step_metadata).toEqual({});
    expect(row?.internal_diagnostics).toBeNull();
  });
});

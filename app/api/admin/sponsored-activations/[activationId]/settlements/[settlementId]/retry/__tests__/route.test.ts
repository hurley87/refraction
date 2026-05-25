import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireAdmin = vi.fn();
const mockGetSettlement = vi.fn();
const mockAdminReset = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

vi.mock('@/lib/db/activation-settlement-transactions', () => ({
  getActivationSettlementTransactionById: (...a: unknown[]) =>
    mockGetSettlement(...a),
  adminResetActivationSettlementForRetryAtomic: (...a: unknown[]) =>
    mockAdminReset(...a),
}));

import { POST } from '../route';

const settlementRow = (activationId: string) => ({
  id: 'set-1',
  activation_id: activationId,
  redemption_id: 'red-1',
  settlement_rail: 'base' as const,
  status: 'failed' as const,
  amount: 1,
  from_wallet_address: 'a',
  to_wallet_address: 'b',
  tx_hash: null,
  submission_attempt: 5,
  last_error_code: 'x',
  queued_at: null,
  submitted_at: null,
  confirmed_at: null,
  privy_transaction_id: null,
});

describe('POST /api/admin/.../settlements/.../retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ isValid: true });
    mockGetSettlement.mockResolvedValue(settlementRow('act-1'));
    mockAdminReset.mockResolvedValue('reset');
  });

  it('returns 403 when not admin', async () => {
    mockRequireAdmin.mockResolvedValue({ isValid: false });
    const res = await POST(new NextRequest('http://localhost'), {
      params: { activationId: 'act-1', settlementId: 'set-1' },
    });
    expect(res.status).toBe(403);
  });

  it('resets settlement via RPC when admin', async () => {
    const res = await POST(new NextRequest('http://localhost'), {
      params: { activationId: 'act-1', settlementId: 'set-1' },
    });
    expect(res.status).toBe(200);
    expect(mockAdminReset).toHaveBeenCalledWith({
      settlementId: 'set-1',
      activationId: 'act-1',
    });
  });

  it('returns 404 when settlement is not under activation', async () => {
    mockGetSettlement.mockResolvedValue(settlementRow('other-act'));
    const res = await POST(new NextRequest('http://localhost'), {
      params: { activationId: 'act-1', settlementId: 'set-1' },
    });
    expect(res.status).toBe(404);
    expect(mockAdminReset).not.toHaveBeenCalled();
  });

  it('maps SETTLEMENT_NOT_ELIGIBLE_FOR_RETRY to 400', async () => {
    mockAdminReset.mockRejectedValue(
      new Error('SETTLEMENT_NOT_ELIGIBLE_FOR_RETRY')
    );
    const res = await POST(new NextRequest('http://localhost'), {
      params: { activationId: 'act-1', settlementId: 'set-1' },
    });
    expect(res.status).toBe(400);
  });

  it('maps REDEMPTION_NOT_ELIGIBLE_FOR_RETRY to 400', async () => {
    mockAdminReset.mockRejectedValue(
      new Error('REDEMPTION_NOT_ELIGIBLE_FOR_RETRY')
    );
    const res = await POST(new NextRequest('http://localhost'), {
      params: { activationId: 'act-1', settlementId: 'set-1' },
    });
    expect(res.status).toBe(400);
  });
});

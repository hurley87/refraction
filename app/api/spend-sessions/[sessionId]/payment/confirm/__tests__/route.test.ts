import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockVerifyWallet = vi.fn();
const mockGetPrivyUserId = vi.fn();
const mockGetCtx = vi.fn();
const mockRunConfirm = vi.fn();

vi.mock('@/lib/api/privy', () => ({
  verifyWalletOwnership: (...a: unknown[]) => mockVerifyWallet(...a),
  getPrivyUserIdFromRequest: (...a: unknown[]) => mockGetPrivyUserId(...a),
}));

vi.mock('@/lib/analytics/server', () => ({
  resolveServerIdentity: () => 'distinct-1',
}));

vi.mock('@/lib/spend-payment-confirm', () => ({
  getSpendPaymentContextOr404: (...a: unknown[]) => mockGetCtx(...a),
  runSpendPaymentConfirm: (...a: unknown[]) => mockRunConfirm(...a),
}));

import { POST } from '../route';

const spendTx = {
  id: 'tx-1',
  spend_experience_id: 'exp-1',
  spend_session_id: 'sess-1',
  user_id: 'privy-1',
  usdc_amount: 5,
  from_wallet_address: '0xabc',
  to_wallet_address: '0xdef',
  status: 'confirmed' as const,
  payment_tx_hash: '0x' + '1'.repeat(64),
  idempotency_key: 'k',
  created_at: '2026-01-01T00:00:00.000Z',
  completed_at: '2026-01-01T00:00:01.000Z',
  failed_reason: null,
};

describe('POST /api/spend-sessions/[sessionId]/payment/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyWallet.mockResolvedValue({ authorized: true, userId: 'privy-1' });
    mockGetPrivyUserId.mockResolvedValue('privy-1');
    mockGetCtx.mockResolvedValue({
      session: {
        id: 'sess-1',
        user_id: 'privy-1',
        wallet_address: '0xabcdef0123456789012345678901234567890abc',
        spend_rail: 'base_usdc',
      },
      spendExperience: { id: 'exp-1' },
      usdcAmount: 5,
    });
    mockRunConfirm.mockResolvedValue({
      ok: true,
      spendTransaction: spendTx,
      session: {
        id: 'sess-1',
        status: 'payment_complete',
        expires_at: '2026-01-02T00:00:00.000Z',
        completed_at: '2026-01-01T00:00:01.000Z',
      },
      resumed: false,
      paymentOperation: {
        id: 'prep-1',
        status: 'confirmed',
        attempt_count: 0,
        last_failure_reason: null,
        last_failure_at: null,
      },
    });
  });

  it('returns 200 with spend transaction on success', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/spend-sessions/sess-1/payment/confirm',
      {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: '0xAbCdEf0123456789012345678901234567890aBc',
          paymentTxHash: '0x' + 'a'.repeat(64),
        }),
      }
    );
    const res = await POST(req, { params: { sessionId: 'sess-1' } });
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.data.spendTransaction.id).toBe('tx-1');
    expect(j.data.paymentOperation?.status).toBe('confirmed');
    expect(j.data.session.status).toBe('payment_complete');
    expect(j.data.spendRailSummary).toMatchObject({
      rail: 'base_usdc',
      displayName: 'Base USDC',
    });
  });

  it('returns 400 for invalid paymentTxHash', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/spend-sessions/sess-1/payment/confirm',
      {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: '0xAbCdEf0123456789012345678901234567890aBc',
          paymentTxHash: 'not-a-hash',
        }),
      }
    );
    const res = await POST(req, { params: { sessionId: 'sess-1' } });
    expect(res.status).toBe(400);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockVerifyWallet = vi.fn();
const mockGetPrivyUserId = vi.fn();
const mockGetCtx = vi.fn();
const mockRunPrepare = vi.fn();

vi.mock('@/lib/api/privy', () => ({
  verifyWalletOwnership: (...a: unknown[]) => mockVerifyWallet(...a),
  getPrivyUserIdFromRequest: (...a: unknown[]) => mockGetPrivyUserId(...a),
}));

vi.mock('@/lib/analytics/server', () => ({
  resolveServerIdentity: () => 'distinct-1',
}));

vi.mock('@/lib/spend-payment-prepare', () => ({
  getSpendPaymentPrepareContextOr404: (...a: unknown[]) => mockGetCtx(...a),
  runSpendPaymentPrepare: (...a: unknown[]) => mockRunPrepare(...a),
}));

import { POST } from '../route';

describe('POST /api/spend-sessions/[sessionId]/payment/prepare', () => {
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
    mockRunPrepare.mockResolvedValue({
      ok: true,
      preparedAction: {
        v: 1,
        spend_rail: 'base_usdc',
        evmTransactionRequest: {
          chainId: 8453,
          to: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
          data: '0xabcd',
          gas: '100000',
        },
      },
      session: {
        id: 'sess-1',
        status: 'conversion_complete',
        expires_at: '2099-01-01T00:00:00.000Z',
      },
    });
  });

  it('returns 200 with preparedAction on success', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/spend-sessions/sess-1/payment/prepare',
      {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: '0xAbCdEf0123456789012345678901234567890aBc',
        }),
      }
    );
    const res = await POST(req, { params: { sessionId: 'sess-1' } });
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.data.preparedAction.evmTransactionRequest.gas).toBe('100000');
    expect(j.data.spendRailSummary).toMatchObject({
      rail: 'base_usdc',
      displayName: 'Base USDC',
    });
  });

  it('returns 400 for invalid walletAddress', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/spend-sessions/sess-1/payment/prepare',
      {
        method: 'POST',
        body: JSON.stringify({ walletAddress: 'not-an-address' }),
      }
    );
    const res = await POST(req, { params: { sessionId: 'sess-1' } });
    expect(res.status).toBe(400);
  });
});

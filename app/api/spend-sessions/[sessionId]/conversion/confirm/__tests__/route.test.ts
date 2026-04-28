import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockVerifyWallet = vi.fn();
const mockGetPrivyUserId = vi.fn();
const mockGetSpendContext = vi.fn();
const mockRunConfirm = vi.fn();
const mockResolve = vi.fn();

vi.mock('@/lib/api/privy', () => ({
  getPrivyUserIdFromRequest: (...a: unknown[]) => mockGetPrivyUserId(...a),
  verifyWalletOwnership: (...a: unknown[]) => mockVerifyWallet(...a),
}));

vi.mock('@/lib/spend-conversion-confirm', () => ({
  getSpendContextOr404: (...a: unknown[]) => mockGetSpendContext(...a),
  runSpendConversionConfirm: (...a: unknown[]) => mockRunConfirm(...a),
}));

vi.mock('@/lib/analytics/server', () => ({
  resolveServerIdentity: (...a: unknown[]) => mockResolve(...a),
}));

import { POST } from '../route';

const session = {
  id: 'sess-1',
  spend_experience_id: 'exp-1',
  user_id: 'privy-1',
  wallet_address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  status: 'created' as const,
  qr_token_hash: null,
  created_at: '2026-01-01T00:00:00.000Z',
  expires_at: '2026-01-02T00:00:00.000Z',
  completed_at: null,
};

const spendExperience = {
  id: 'exp-1',
  title: 'Event',
  points_to_usdc_rate: 1000,
  max_usdc_per_user: 5,
  treasury_wallet_address: '0x1111111111111111111111111111111111111111',
  receiving_wallet_address: '0x2222222222222222222222222222222222222222',
} as const;

describe('POST /api/spend-sessions/[sessionId]/conversion/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when wallet ownership fails', async () => {
    mockVerifyWallet.mockResolvedValue({
      authorized: false,
      error: 'Unauthorized',
    });
    const req = new NextRequest(
      'http://localhost:3000/api/spend-sessions/sess-1/conversion/confirm',
      {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        }),
      }
    );
    const res = await POST(req, { params: { sessionId: 'sess-1' } });
    expect(res.status).toBe(401);
  });

  it('returns success payload when conversion succeeds', async () => {
    mockVerifyWallet.mockResolvedValue({
      authorized: true,
      userId: 'privy-1',
    });
    mockGetPrivyUserId.mockResolvedValue('privy-1');
    mockGetSpendContext.mockResolvedValue({
      session,
      spendExperience,
      usdcAmount: 5,
      pointsRequired: 5000,
    });
    mockResolve.mockReturnValue('distinct-1');
    mockRunConfirm.mockResolvedValue({
      ok: true,
      pointConversion: {
        id: 'conv-1',
        spend_experience_id: spendExperience.id,
        spend_session_id: session.id,
        user_id: 'privy-1',
        points_deducted: 5000,
        usdc_amount: 5,
        status: 'funded',
        treasury_wallet_address: spendExperience.treasury_wallet_address,
        user_wallet_address: session.wallet_address,
        funding_tx_hash: '0xabc',
        idempotency_key: null,
        created_at: '2026-01-01T00:00:00.000Z',
        completed_at: '2026-01-01T00:00:01.000Z',
        failed_reason: null,
      },
      session: { ...session, status: 'conversion_complete' as const },
      resumed: false,
    });

    const req = new NextRequest(
      'http://localhost:3000/api/spend-sessions/sess-1/conversion/confirm',
      {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: session.wallet_address,
        }),
      }
    );
    const res = await POST(req, { params: { sessionId: 'sess-1' } });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      success: boolean;
      data: { pointConversion: { status: string } };
    };
    expect(json.success).toBe(true);
    expect(json.data.pointConversion.status).toBe('funded');
  });
});

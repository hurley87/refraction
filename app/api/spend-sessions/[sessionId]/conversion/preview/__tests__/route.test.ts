import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockVerifyWallet = vi.fn();
const mockGetPrivyUserId = vi.fn();
const mockGetSession = vi.fn();
const mockGetExperience = vi.fn();
const mockLoadEligibility = vi.fn();
const mockFinalizePending = vi.fn();
const mockTrackPreview = vi.fn();
const mockTrackAlready = vi.fn();
const mockTrackTreasury = vi.fn();
const mockResolve = vi.fn();

vi.mock('@/lib/api/privy', () => ({
  getPrivyUserIdFromRequest: (...a: unknown[]) => mockGetPrivyUserId(...a),
  verifyWalletOwnership: (...a: unknown[]) => mockVerifyWallet(...a),
}));

vi.mock('@/lib/db/spend-sessions', () => ({
  getSpendSessionById: (...a: unknown[]) => mockGetSession(...a),
}));

vi.mock('@/lib/db/spend-experiences', () => ({
  getSpendExperienceById: (...a: unknown[]) => mockGetExperience(...a),
}));

vi.mock('@/lib/spend-conversion-preview', () => ({
  computeConversionAmounts: () => ({ usdcAmount: 5, pointsRequired: 5000 }),
  loadSpendEligibilityForSession: (...a: unknown[]) =>
    mockLoadEligibility(...a),
}));

vi.mock('@/lib/spend-conversion-confirm', () => ({
  tryFinalizePendingSpendConversion: (...a: unknown[]) =>
    mockFinalizePending(...a),
}));

vi.mock('@/lib/analytics/server', () => ({
  trackSpendConversionPreviewed: (...a: unknown[]) => mockTrackPreview(...a),
  trackSpendUserAlreadyConverted: (...a: unknown[]) => mockTrackAlready(...a),
  trackSpendTreasuryInsufficientFunds: (...a: unknown[]) =>
    mockTrackTreasury(...a),
  resolveServerIdentity: (...a: unknown[]) => mockResolve(...a),
}));

import { POST } from '../route';

const session = {
  id: 'sess-1',
  spend_experience_id: 'exp-1',
  user_id: 'privy-1',
  wallet_address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  spend_rail: 'base_usdc' as const,
  rail_user_wallet_address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  status: 'created' as const,
  qr_token_hash: null,
  created_at: '2026-01-01T00:00:00.000Z',
  expires_at: '2026-01-02T00:00:00.000Z',
  completed_at: null,
};

const experience = {
  id: 'exp-1',
  title: 'Test',
  event_id: null,
  max_usdc_per_user: 5,
  points_to_usdc_rate: 1000,
  treasury_wallet_address: '0x1111111111111111111111111111111111111111',
  receiving_wallet_address: '0x2222222222222222222222222222222222222222',
} as const;

describe('POST /api/spend-sessions/[sessionId]/conversion/preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyWallet.mockResolvedValue({
      authorized: true,
      userId: 'privy-1',
    });
    mockGetPrivyUserId.mockResolvedValue('privy-1');
    mockGetSession.mockResolvedValue(session);
    mockGetExperience.mockResolvedValue(experience);
    mockFinalizePending.mockResolvedValue(null);
    mockResolve.mockReturnValue('distinct-1');
    mockLoadEligibility.mockResolvedValue({
      status: 'eligible',
      message: 'ok',
      preview: {
        pointsRequired: 5000,
        usdcAmount: 5,
        receivingWalletAddress: '0x2222222222222222222222222222222222222222',
        treasuryWalletAddress: '0x4444444444444444444444444444444444444444',
        userPointsBalance: 6000,
        treasuryUsdcBalance: 100,
      },
    });
  });

  it('returns 401 when wallet ownership fails', async () => {
    mockVerifyWallet.mockResolvedValue({ authorized: false, error: 'no' });
    const req = new NextRequest(
      'http://localhost:3000/api/spend-sessions/sess-1/conversion/preview',
      {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        }),
      }
    );
    const res = await POST(req, { params: { sessionId: 'sess-1' } });
    expect(res.status).toBe(401);
  });

  it('returns eligibility when authorized', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/spend-sessions/sess-1/conversion/preview',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer t' },
        body: JSON.stringify({
          walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        }),
      }
    );
    const res = await POST(req, { params: { sessionId: 'sess-1' } });
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.data.eligibility.status).toBe('eligible');
    expect(j.data.spendRailSummary).toMatchObject({
      rail: 'base_usdc',
      displayName: 'Base USDC',
      networkLabel: 'Base',
      assetSymbol: 'USDC',
    });
    expect(j.data.spendRailSummary.explorerTxUrlTemplate).toContain('{txHash}');
    expect(mockTrackPreview).toHaveBeenCalled();
  });

  it('returns finalized state when a pending conversion completes on poll', async () => {
    mockGetSession.mockResolvedValueOnce(session).mockResolvedValueOnce({
      ...session,
      status: 'conversion_complete',
    });
    mockFinalizePending.mockResolvedValue({
      id: 'conv-1',
      status: 'funded',
    });

    const req = new NextRequest(
      'http://localhost:3000/api/spend-sessions/sess-1/conversion/preview',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer t' },
        body: JSON.stringify({
          walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        }),
      }
    );

    const res = await POST(req, { params: { sessionId: 'sess-1' } });
    const j = await res.json();

    expect(res.status).toBe(200);
    expect(j.data.session.status).toBe('conversion_complete');
    expect(mockLoadEligibility).toHaveBeenCalledWith(
      expect.objectContaining({
        session: expect.objectContaining({ status: 'conversion_complete' }),
      })
    );
  });

  it('fires spend_user_already_converted when applicable', async () => {
    mockLoadEligibility.mockResolvedValue({
      status: 'already_converted',
      message: 'done',
      preview: null,
    });
    const req = new NextRequest(
      'http://localhost:3000/api/spend-sessions/sess-1/conversion/preview',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer t' },
        body: JSON.stringify({
          walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        }),
      }
    );
    await POST(req, { params: { sessionId: 'sess-1' } });
    expect(mockTrackAlready).toHaveBeenCalled();
  });
});

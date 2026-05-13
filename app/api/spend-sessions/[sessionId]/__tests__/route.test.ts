import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetPrivyUserId = vi.fn();
const mockGetSession = vi.fn();
const mockGetConversion = vi.fn();
const mockGetExperience = vi.fn();

vi.mock('@/lib/api/privy', () => ({
  getPrivyUserIdFromRequest: (...a: unknown[]) => mockGetPrivyUserId(...a),
}));

vi.mock('@/lib/db/spend-sessions', () => ({
  getSpendSessionById: (...a: unknown[]) => mockGetSession(...a),
  getPointConversionBySessionId: (...a: unknown[]) => mockGetConversion(...a),
}));

vi.mock('@/lib/db/spend-experiences', () => ({
  getSpendExperienceById: (...a: unknown[]) => mockGetExperience(...a),
}));

const mockMaybeReconcile = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/spend/opportunistic-spend-rail-reconcile-on-read', () => ({
  maybeReconcileSpendRailOnAuthorizedSessionRead: (...a: unknown[]) =>
    mockMaybeReconcile(...a),
}));

import { GET } from '../route';

const session = {
  id: 'sess-1',
  spend_experience_id: 'exp-1',
  user_id: 'privy-1',
  wallet_address: '0xabc',
  spend_rail: 'base_usdc' as const,
  rail_user_wallet_address: '0xabc',
  status: 'created' as const,
  qr_token_hash: null,
  created_at: '2026-01-01T00:00:00.000Z',
  expires_at: '2026-01-02T00:00:00.000Z',
  completed_at: null,
};

describe('GET /api/spend-sessions/[sessionId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPrivyUserId.mockResolvedValue('privy-1');
    mockGetSession.mockResolvedValue(session);
    mockGetConversion.mockResolvedValue(null);
    mockGetExperience.mockResolvedValue({ id: 'exp-1', title: 'E' });
    mockMaybeReconcile.mockResolvedValue(undefined);
  });

  it('returns 401 without token', async () => {
    mockGetPrivyUserId.mockResolvedValue(null);
    const req = new NextRequest(
      'http://localhost:3000/api/spend-sessions/sess-1'
    );
    const res = await GET(req, { params: { sessionId: 'sess-1' } });
    expect(res.status).toBe(401);
  });

  it('returns 403 for wrong user', async () => {
    mockGetPrivyUserId.mockResolvedValue('other');
    const req = new NextRequest(
      'http://localhost:3000/api/spend-sessions/sess-1'
    );
    const res = await GET(req, { params: { sessionId: 'sess-1' } });
    expect(res.status).toBe(403);
  });

  it('returns session and experience for owner', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/spend-sessions/sess-1'
    );
    const res = await GET(req, { params: { sessionId: 'sess-1' } });
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.data.session).toEqual(session);
    expect(j.data.spendExperience).toEqual({ id: 'exp-1', title: 'E' });
    expect(mockMaybeReconcile).toHaveBeenCalledWith({
      spendSessionId: 'sess-1',
      session,
    });
    expect(mockGetSession).toHaveBeenCalledTimes(2);
  });

  it('returns post-reconcile session from the second load', async () => {
    const pending = { ...session, status: 'payment_pending' as const };
    const complete = { ...session, status: 'payment_complete' as const };
    mockGetSession
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(complete);
    const req = new NextRequest(
      'http://localhost:3000/api/spend-sessions/sess-1'
    );
    const res = await GET(req, { params: { sessionId: 'sess-1' } });
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.data.session).toEqual(complete);
    expect(mockMaybeReconcile).toHaveBeenCalledWith({
      spendSessionId: 'sess-1',
      session: pending,
    });
  });
});

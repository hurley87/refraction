import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockVerifyWallet = vi.fn();
const mockGetPrivyUserId = vi.fn();
const mockGetExperience = vi.fn();
const mockCreateOrGet = vi.fn();
const mockAssert = vi.fn();
const mockTrack = vi.fn();
const mockResolve = vi.fn();

vi.mock('@/lib/api/privy', () => ({
  verifyWalletOwnership: (...a: unknown[]) => mockVerifyWallet(...a),
  getPrivyUserIdFromRequest: (...a: unknown[]) => mockGetPrivyUserId(...a),
}));

vi.mock('@/lib/db/spend-experiences', () => ({
  getSpendExperienceById: (...a: unknown[]) => mockGetExperience(...a),
}));

vi.mock('@/lib/db/spend-sessions', () => ({
  createOrGetSpendSession: (...a: unknown[]) => mockCreateOrGet(...a),
}));

vi.mock('@/lib/spend-experience-guard', () => ({
  assertSpendExperienceOpenForSessions: (...a: unknown[]) => mockAssert(...a),
}));

vi.mock('@/lib/analytics/server', () => ({
  trackSpendSessionCreated: (...a: unknown[]) => mockTrack(...a),
  resolveServerIdentity: (...a: unknown[]) => mockResolve(...a),
}));

import { POST } from '../route';

const experience = {
  id: 'exp-uuid',
  title: 'E',
  description: null,
  event_id: 'evt-1',
  status: 'active' as const,
  points_to_usdc_rate: 1000,
  max_usdc_per_user: 5,
  treasury_wallet_address: '0x1111111111111111111111111111111111111111',
  receiving_wallet_address: '0x2222222222222222222222222222222222222222',
  start_time: '2026-01-01T00:00:00.000Z',
  end_time: '2026-12-31T00:00:00.000Z',
  created_by: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const session = {
  id: 'sess-1',
  spend_experience_id: 'exp-uuid',
  user_id: 'privy-1',
  wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
  status: 'created' as const,
  qr_token_hash: null,
  created_at: '2026-06-01T00:00:00.000Z',
  expires_at: '2026-06-01T12:00:00.000Z',
  completed_at: null,
};

const wallet = '0x1234567890abcdef1234567890abcdef12345678';

function postRequest(body: unknown) {
  return new NextRequest(
    'http://localhost:3000/api/spend-experiences/exp-uuid/sessions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
}

describe('POST /api/spend-experiences/[experienceId]/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyWallet.mockResolvedValue({
      authorized: true,
      userId: 'privy-1',
    });
    mockGetPrivyUserId.mockResolvedValue('privy-1');
    mockGetExperience.mockResolvedValue(experience);
    mockAssert.mockReturnValue({ ok: true });
    mockCreateOrGet.mockResolvedValue({ session, created: true });
    mockResolve.mockReturnValue('privy-1');
  });

  it('returns 400 when experience not open', async () => {
    mockAssert.mockReturnValue({
      ok: false,
      error: 'Spend experience is not active',
      httpStatus: 400,
    });
    const res = await POST(postRequest({ walletAddress: wallet }), {
      params: { experienceId: 'exp-uuid' },
    });
    const j = await res.json();
    expect(res.status).toBe(400);
    expect(j.error).toContain('not active');
    expect(mockCreateOrGet).not.toHaveBeenCalled();
  });

  it('creates session and tracks on success', async () => {
    const res = await POST(postRequest({ walletAddress: wallet }), {
      params: { experienceId: 'exp-uuid' },
    });
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.data.session).toEqual(session);
    expect(j.data.created).toBe(true);
    expect(mockTrack).toHaveBeenCalled();
  });

  it('returns 401 when wallet not owned', async () => {
    mockVerifyWallet.mockResolvedValue({ authorized: false, error: 'Nope' });
    const res = await POST(postRequest({ walletAddress: wallet }), {
      params: { experienceId: 'exp-uuid' },
    });
    expect(res.status).toBe(401);
  });
});

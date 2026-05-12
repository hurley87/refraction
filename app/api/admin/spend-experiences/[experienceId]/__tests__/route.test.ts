import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireAdmin = vi.fn();
const mockGetSpendExperienceById = vi.fn();
const mockUpdateSpendExperience = vi.fn();
const mockGetFundingStatus = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

vi.mock('@/lib/db/spend-experiences', () => ({
  getSpendExperienceById: (...args: unknown[]) =>
    mockGetSpendExperienceById(...args),
  updateSpendExperience: (...args: unknown[]) =>
    mockUpdateSpendExperience(...args),
}));

vi.mock('@/lib/spend-server-wallet', () => ({
  getServerWalletFundingStatus: (...args: unknown[]) =>
    mockGetFundingStatus(...args),
}));

import { PATCH, GET } from '../route';

const existing = {
  id: 'exp-1',
  title: 'Old',
  description: null,
  event_id: null,
  status: 'draft' as const,
  spend_rail: 'base_usdc' as const,
  points_to_usdc_rate: 1000,
  max_usdc_per_user: 5,
  treasury_wallet_address: '0x1111111111111111111111111111111111111111',
  receiving_wallet_address: '0x2222222222222222222222222222222222222222',
  privy_server_wallet_id: 'wallet-1',
  server_wallet_address: '0x1111111111111111111111111111111111111111',
  server_wallet_chain: 'base-mainnet',
  server_wallet_created_at: '2026-04-01T00:00:00Z',
  spend_create_idempotency_key: 'idem-1',
  start_time: '2026-05-01T12:00:00.000Z',
  end_time: '2026-05-08T12:00:00.000Z',
  created_by: 'a@b.com',
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
};

function patchRequest(body: Record<string, unknown>, email?: string) {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  if (email) headers.set('x-user-email', email);
  return new NextRequest(
    'http://localhost:3000/api/admin/spend-experiences/exp-1',
    { method: 'PATCH', headers, body: JSON.stringify(body) }
  );
}

describe('GET /api/admin/spend-experiences/[experienceId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with spend experience when admin', async () => {
    mockRequireAdmin.mockResolvedValue({
      isValid: true,
      user: { email: 'admin@example.com' },
    });
    mockGetSpendExperienceById.mockResolvedValue(existing);
    const headers = new Headers();
    headers.set('x-user-email', 'admin@example.com');
    const req = new NextRequest(
      'http://localhost:3000/api/admin/spend-experiences/exp-1',
      { method: 'GET', headers }
    );
    const res = await GET(req, { params: { experienceId: 'exp-1' } });
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.data.spendExperience).toEqual(existing);
  });

  it('returns 404 for GET when missing', async () => {
    mockRequireAdmin.mockResolvedValue({
      isValid: true,
      user: { email: 'admin@example.com' },
    });
    mockGetSpendExperienceById.mockResolvedValue(null);
    const headers = new Headers();
    headers.set('x-user-email', 'admin@example.com');
    const req = new NextRequest(
      'http://localhost:3000/api/admin/spend-experiences/missing',
      { method: 'GET', headers }
    );
    const res = await GET(req, { params: { experienceId: 'missing' } });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/admin/spend-experiences/[experienceId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when not admin', async () => {
    mockRequireAdmin.mockResolvedValue({ isValid: false });
    const res = await PATCH(patchRequest({ title: 'x' }, 'u@v.com'), {
      params: { experienceId: 'exp-1' },
    });
    expect(res.status).toBe(403);
    expect(mockUpdateSpendExperience).not.toHaveBeenCalled();
  });

  it('returns 404 when experience missing', async () => {
    mockRequireAdmin.mockResolvedValue({
      isValid: true,
      user: { email: 'admin@example.com' },
    });
    mockGetSpendExperienceById.mockResolvedValue(null);

    const res = await PATCH(patchRequest({ title: 'x' }, 'admin@example.com'), {
      params: { experienceId: 'missing' },
    });
    const j = await res.json();
    expect(res.status).toBe(404);
    expect(j.success).toBe(false);
    expect(mockUpdateSpendExperience).not.toHaveBeenCalled();
  });

  it('returns 400 when merged window is invalid', async () => {
    mockRequireAdmin.mockResolvedValue({
      isValid: true,
      user: { email: 'admin@example.com' },
    });
    mockGetSpendExperienceById.mockResolvedValue(existing);

    const res = await PATCH(
      patchRequest(
        { start_time: '2026-06-10T12:00:00.000Z' },
        'admin@example.com'
      ),
      { params: { experienceId: 'exp-1' } }
    );
    const j = await res.json();
    expect(res.status).toBe(400);
    expect(j.success).toBe(false);
    expect(j.error).toContain('end_time');
    expect(mockUpdateSpendExperience).not.toHaveBeenCalled();
  });

  it('blocks activation until the server wallet has max USDC per user', async () => {
    mockRequireAdmin.mockResolvedValue({
      isValid: true,
      user: { email: 'admin@example.com' },
    });
    mockGetSpendExperienceById.mockResolvedValue(existing);
    mockGetFundingStatus.mockResolvedValue({ usdcBalance: 2, isFunded: false });

    const res = await PATCH(
      patchRequest({ status: 'active' }, 'admin@example.com'),
      { params: { experienceId: 'exp-1' } }
    );
    const j = await res.json();

    expect(res.status).toBe(400);
    expect(j.error).toContain('Server wallet');
    expect(mockUpdateSpendExperience).not.toHaveBeenCalled();
  });

  it('allows activation when the server wallet is funded', async () => {
    mockRequireAdmin.mockResolvedValue({
      isValid: true,
      user: { email: 'admin@example.com' },
    });
    mockGetSpendExperienceById.mockResolvedValue(existing);
    mockGetFundingStatus.mockResolvedValue({ usdcBalance: 6, isFunded: true });
    mockUpdateSpendExperience.mockResolvedValue({
      ...existing,
      status: 'active',
    });

    const res = await PATCH(
      patchRequest({ status: 'active' }, 'admin@example.com'),
      { params: { experienceId: 'exp-1' } }
    );

    expect(res.status).toBe(200);
    expect(mockGetFundingStatus).toHaveBeenCalledWith({
      walletAddress: '0x4444444444444444444444444444444444444444',
      minUsdcRequired: existing.max_usdc_per_user,
    });
    expect(mockUpdateSpendExperience).toHaveBeenCalledWith(
      'exp-1',
      { status: 'active' },
      'base_usdc'
    );
  });

  it('returns 400 when spend_rail is present in PATCH body', async () => {
    mockRequireAdmin.mockResolvedValue({
      isValid: true,
      user: { email: 'admin@example.com' },
    });
    mockGetSpendExperienceById.mockResolvedValue(existing);

    const res = await PATCH(
      patchRequest(
        { title: 'ok', spend_rail: 'stellar_usdc' },
        'admin@example.com'
      ),
      { params: { experienceId: 'exp-1' } }
    );
    const j = await res.json();

    expect(res.status).toBe(400);
    expect(j.success).toBe(false);
    expect(mockUpdateSpendExperience).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireAdmin = vi.fn();
const mockGetSpendExperienceById = vi.fn();
const mockGetTotals = vi.fn();
const mockListActivity = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

vi.mock('@/lib/db/spend-experiences', () => ({
  getSpendExperienceById: (...args: unknown[]) =>
    mockGetSpendExperienceById(...args),
}));

vi.mock('@/lib/db/spend-admin', () => ({
  getSpendPilotAdminTotals: (...args: unknown[]) => mockGetTotals(...args),
  listSpendPilotActivityForExperience: (...args: unknown[]) =>
    mockListActivity(...args),
}));

import { GET } from '../route';

const experience = {
  id: 'exp-1',
  title: 'Pilot',
  description: null,
  event_id: null,
  status: 'active' as const,
  spend_rail: 'base_usdc' as const,
  points_to_usdc_rate: 1000,
  max_usdc_per_user: 5,
  treasury_wallet_address: '0x1111111111111111111111111111111111111111',
  receiving_wallet_address: '0x2222222222222222222222222222222222222222',
  start_time: '2026-05-01T12:00:00.000Z',
  end_time: '2026-05-08T12:00:00.000Z',
  created_by: 'a@b.com',
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
};

describe('GET /api/admin/spend-experiences/[experienceId]/activity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_MIXPANEL_TOKEN', 'proj-token');
  });

  it('returns totals and activity when admin', async () => {
    mockRequireAdmin.mockResolvedValue({
      isValid: true,
      user: { email: 'admin@example.com' },
    });
    mockGetSpendExperienceById.mockResolvedValue(experience);
    mockGetTotals.mockResolvedValue({
      usersConverted: 2,
      totalUsdcDistributed: 10,
      totalUsdcReceivedAtEventWallet: 8,
      spendSessionsCount: 5,
    });
    mockListActivity.mockResolvedValue({
      sessions: [],
      failedConversions: [],
      failedPayments: [],
    });

    const headers = new Headers();
    headers.set('x-user-email', 'admin@example.com');
    const req = new NextRequest(
      'http://localhost:3000/api/admin/spend-experiences/exp-1/activity',
      { method: 'GET', headers }
    );
    const res = await GET(req, { params: { experienceId: 'exp-1' } });
    const j = await res.json();

    expect(res.status).toBe(200);
    expect(j.data.totals.usersConverted).toBe(2);
    expect(j.data.mixpanelInsightUrl).toContain('proj-token');
  });

  it('returns 404 when experience missing', async () => {
    mockRequireAdmin.mockResolvedValue({
      isValid: true,
      user: { email: 'admin@example.com' },
    });
    mockGetSpendExperienceById.mockResolvedValue(null);

    const headers = new Headers();
    headers.set('x-user-email', 'admin@example.com');
    const req = new NextRequest(
      'http://localhost:3000/api/admin/spend-experiences/missing/activity',
      { method: 'GET', headers }
    );
    const res = await GET(req, { params: { experienceId: 'missing' } });
    expect(res.status).toBe(404);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireAdmin = vi.fn();
const mockGetSpendExperienceById = vi.fn();
const mockFetchBalance = vi.fn();
const mockListLedger = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

vi.mock('@/lib/db/spend-experiences', () => ({
  getSpendExperienceById: (...args: unknown[]) =>
    mockGetSpendExperienceById(...args),
}));

vi.mock('@/lib/spend-server-wallet', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/spend-server-wallet')>();
  return {
    ...actual,
    fetchServerWalletUsdcBalanceSafe: (...args: unknown[]) =>
      mockFetchBalance(...args),
  };
});

vi.mock('@/lib/db/treasury-transactions', () => ({
  listTreasuryTransactionsForExperience: (...args: unknown[]) =>
    mockListLedger(...args),
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
  privy_server_wallet_id: 'privy-wallet-1',
  server_wallet_address: '0x3333333333333333333333333333333333333333',
  server_wallet_chain: 'base-mainnet',
  server_wallet_created_at: '2026-04-01T00:00:00Z',
  spend_create_idempotency_key: 'idem-1',
  start_time: '2026-05-01T12:00:00.000Z',
  end_time: '2026-05-08T12:00:00.000Z',
  created_by: 'a@b.com',
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
};

describe('GET /api/admin/spend-experiences/[experienceId]/treasury', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns balance and ledger totals', async () => {
    mockRequireAdmin.mockResolvedValue({
      isValid: true,
      user: { email: 'admin@example.com' },
    });
    mockGetSpendExperienceById.mockResolvedValue(experience);
    mockFetchBalance.mockResolvedValue(123.45);
    mockListLedger.mockResolvedValue([
      {
        id: 't1',
        spend_experience_id: 'exp-1',
        transaction_type: 'fund_user',
        amount: 5,
        from_wallet_address: '0x11',
        to_wallet_address: '0xaa',
        tx_hash: '0xabc',
        status: 'confirmed',
        created_at: '2026-04-01T00:00:00Z',
      },
    ]);

    const headers = new Headers();
    headers.set('x-user-email', 'admin@example.com');
    const req = new NextRequest(
      'http://localhost:3000/api/admin/spend-experiences/exp-1/treasury',
      { method: 'GET', headers }
    );
    const res = await GET(req, { params: { experienceId: 'exp-1' } });
    const j = await res.json();

    expect(res.status).toBe(200);
    expect(mockFetchBalance).toHaveBeenCalledWith(
      expect.objectContaining({
        spend_rail: 'base_usdc',
      })
    );
    expect(j.data.serverWalletUsdcBalance).toBe(123.45);
    expect(j.data.funding.funded).toBe(true);
    expect(j.data.ledgerTotals.fund_user_usdc).toBe(5);
  });
});

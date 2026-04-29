import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { TransactionNotFoundError } from 'viem';

const mockRequireAdmin = vi.fn();
const mockGetSpendExperienceById = vi.fn();
const mockFetchBalance = vi.fn();
const mockGetTransferConfig = vi.fn();
const mockSubmitTransfer = vi.fn();
const mockWaitReceipt = vi.fn();
const mockFindRecentTransfer = vi.fn();
const mockInsertLedger = vi.fn();

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
    getSpendServerWalletTransferConfig: (...args: unknown[]) =>
      mockGetTransferConfig(...args),
  };
});

vi.mock('@/lib/spend-treasury-usdc-transfer', () => ({
  submitTreasuryUsdcTransfer: (...args: unknown[]) =>
    mockSubmitTransfer(...args),
  waitForTreasuryTxReceipt: (...args: unknown[]) => mockWaitReceipt(...args),
  findRecentTreasuryUsdcTransfer: (...args: unknown[]) =>
    mockFindRecentTransfer(...args),
}));

vi.mock('@/lib/db/treasury-transactions', () => ({
  insertTreasuryAdminRecoveryLedgerIfAbsent: (...args: unknown[]) =>
    mockInsertLedger(...args),
}));

import { POST } from '../route';

const experience = {
  id: 'exp-1',
  title: 'Pilot',
  description: null,
  event_id: null,
  status: 'active' as const,
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

describe('POST /api/admin/spend-experiences/[experienceId]/treasury/withdraw', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      isValid: true,
      user: { email: 'admin@example.com' },
    });
    mockGetSpendExperienceById.mockResolvedValue(experience);
    mockFetchBalance.mockResolvedValue(2.0001);
    mockGetTransferConfig.mockReturnValue({
      walletId: 'privy-wallet-1',
      address: '0x3333333333333333333333333333333333333333' as `0x${string}`,
    });
    mockSubmitTransfer.mockResolvedValue({
      ok: true,
      txHash:
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
    mockWaitReceipt.mockResolvedValue(undefined);
    mockFindRecentTransfer.mockResolvedValue(null);
    mockInsertLedger.mockResolvedValue(undefined);
  });

  it('returns 400 when destination equals server wallet', async () => {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('x-user-email', 'admin@example.com');
    const req = new NextRequest(
      'http://localhost:3000/api/admin/spend-experiences/exp-1/treasury/withdraw',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          destinationAddress: experience.server_wallet_address,
        }),
      }
    );
    const res = await POST(req, { params: { experienceId: 'exp-1' } });
    const j = await res.json();
    expect(res.status).toBe(400);
    expect(j.error).toContain('must differ');
    expect(mockSubmitTransfer).not.toHaveBeenCalled();
  });

  it('submits transfer for full balance and records ledger', async () => {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('x-user-email', 'admin@example.com');
    const dest = '0x4444444444444444444444444444444444444444';
    const req = new NextRequest(
      'http://localhost:3000/api/admin/spend-experiences/exp-1/treasury/withdraw',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ destinationAddress: dest }),
      }
    );
    const res = await POST(req, { params: { experienceId: 'exp-1' } });
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.success).toBe(true);
    expect(j.data.amountUsdc).toBe(2.0001);
    expect(mockSubmitTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientAddress: dest,
        usdcAmount: 2.0001,
      })
    );
    expect(mockInsertLedger).toHaveBeenCalled();
    expect(mockFindRecentTransfer).not.toHaveBeenCalled();
  });

  it('resolves confirmation via transfer logs when receipt wait hits indexing lag', async () => {
    const submittedHash =
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const resolvedFromLogs =
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    mockWaitReceipt
      .mockRejectedValueOnce(
        new TransactionNotFoundError({ hash: submittedHash as `0x${string}` })
      )
      .mockResolvedValueOnce(undefined);
    mockFindRecentTransfer.mockResolvedValueOnce(
      resolvedFromLogs as `0x${string}`
    );

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('x-user-email', 'admin@example.com');
    const dest = '0x4444444444444444444444444444444444444444';
    const req = new NextRequest(
      'http://localhost:3000/api/admin/spend-experiences/exp-1/treasury/withdraw',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ destinationAddress: dest }),
      }
    );
    const res = await POST(req, { params: { experienceId: 'exp-1' } });
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.success).toBe(true);
    expect(j.data.txHash).toBe(resolvedFromLogs);
    expect(mockWaitReceipt).toHaveBeenNthCalledWith(1, submittedHash);
    expect(mockWaitReceipt).toHaveBeenNthCalledWith(2, resolvedFromLogs);
    expect(mockFindRecentTransfer).toHaveBeenCalled();
    expect(mockInsertLedger).toHaveBeenCalledWith(
      expect.objectContaining({ txHash: resolvedFromLogs })
    );
  });
});

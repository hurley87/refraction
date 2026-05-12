import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockListCatalog } = vi.hoisted(() => ({
  mockListCatalog: vi.fn(),
}));

const mockRequireAdmin = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

vi.mock('@/lib/spend-rail-config', () => ({
  listSpendRailCatalog: mockListCatalog,
}));

import { GET } from '../route';

describe('GET /api/admin/spend-rails/catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListCatalog.mockReturnValue([
      {
        rail: 'base_usdc',
        displayName: 'Base USDC',
        networkLabel: 'Base',
        assetSymbol: 'USDC',
        explorerTxUrlTemplate: 'https://basescan.org/tx/{txHash}',
        allowsNewSpendWork: true,
        adminUnavailableReasons: [],
        receivingWalletAddress: '0x2222222222222222222222222222222222222222',
      },
    ]);
  });

  it('returns 403 when not admin', async () => {
    mockRequireAdmin.mockResolvedValue({ isValid: false });
    const res = await GET(
      new NextRequest('http://localhost:3000/api/admin/spend-rails/catalog')
    );
    expect(res.status).toBe(403);
    expect(mockListCatalog).not.toHaveBeenCalled();
  });

  it('returns catalog rows when admin', async () => {
    mockRequireAdmin.mockResolvedValue({
      isValid: true,
      user: { email: 'a@b.com' },
    });
    const res = await GET(
      new NextRequest('http://localhost:3000/api/admin/spend-rails/catalog')
    );
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(mockListCatalog).toHaveBeenCalled();
    expect(j.data.rails).toHaveLength(1);
    expect(j.data.rails[0].rail).toBe('base_usdc');
    expect(j.data.rails[0].receivingWalletAddress).toContain('0x2222');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireAdmin = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

import { GET } from '../route';

describe('GET /api/admin/spend-rails/availability', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when not admin', async () => {
    mockRequireAdmin.mockResolvedValue({ isValid: false });
    const req = new NextRequest(
      'http://localhost:3000/api/admin/spend-rails/availability',
      { method: 'GET', headers: new Headers({ 'x-user-email': 'u@x.com' }) }
    );
    const res = await GET(req);
    const j = await res.json();
    expect(res.status).toBe(403);
    expect(j.success).toBe(false);
  });

  it('returns rails payload for admin', async () => {
    mockRequireAdmin.mockResolvedValue({
      isValid: true,
      user: { email: 'admin@example.com' },
    });
    const req = new NextRequest(
      'http://localhost:3000/api/admin/spend-rails/availability',
      { method: 'GET', headers: new Headers({ 'x-user-email': 'admin@x.com' }) }
    );
    const res = await GET(req);
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.success).toBe(true);
    expect(j.data.rails.base_usdc.operational).toBeTypeOf('boolean');
    expect(
      j.data.rails.base_usdc.unavailableReason === null ||
        typeof j.data.rails.base_usdc.unavailableReason === 'string'
    ).toBe(true);
    expect(j.data.rails.stellar_usdc.operational).toBeTypeOf('boolean');
    expect(
      j.data.rails.stellar_usdc.unavailableReason === null ||
        typeof j.data.rails.stellar_usdc.unavailableReason === 'string'
    ).toBe(true);
  });
});

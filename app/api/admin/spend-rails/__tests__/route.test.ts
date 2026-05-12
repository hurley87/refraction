import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireAdmin = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

import { GET } from '../route';

function jsonRequest(email?: string): NextRequest {
  const headers = new Headers();
  if (email) headers.set('x-user-email', email);
  return new NextRequest('http://localhost:3000/api/admin/spend-rails', {
    method: 'GET',
    headers,
  });
}

describe('GET /api/admin/spend-rails', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when not admin', async () => {
    mockRequireAdmin.mockResolvedValue({ isValid: false });
    const res = await GET(jsonRequest('user@example.com'));
    expect(res.status).toBe(403);
  });

  it('returns both rails with receiving addresses for admin', async () => {
    mockRequireAdmin.mockResolvedValue({
      isValid: true,
      user: { email: 'admin@example.com' },
    });

    const res = await GET(jsonRequest('admin@example.com'));
    const j = await res.json();

    expect(res.status).toBe(200);
    expect(j.success).toBe(true);
    expect(j.data.rails).toHaveLength(2);
    const base = j.data.rails.find(
      (r: { spend_rail: string }) => r.spend_rail === 'base_usdc'
    );
    expect(base.displayName).toBe('Base USDC');
    expect(base.receivingWalletAddress.toLowerCase()).toBe(
      '0x2222222222222222222222222222222222222222'
    );
    expect(typeof base.operational).toBe('boolean');
    expect(Array.isArray(base.unavailableReasons)).toBe(true);
  });
});

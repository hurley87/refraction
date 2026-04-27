import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireAdmin = vi.fn();
const mockListSpendExperiences = vi.fn();
const mockCreateSpendExperience = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

vi.mock('@/lib/db/spend-experiences', () => ({
  listSpendExperiences: (...args: unknown[]) =>
    mockListSpendExperiences(...args),
  createSpendExperience: (...args: unknown[]) =>
    mockCreateSpendExperience(...args),
}));

import { GET, POST } from '../route';

function jsonRequest(
  method: 'GET' | 'POST',
  body?: Record<string, unknown>,
  emailHeader?: string
): NextRequest {
  const headers = new Headers();
  if (emailHeader) headers.set('x-user-email', emailHeader);
  if (body) headers.set('Content-Type', 'application/json');
  return new NextRequest('http://localhost:3000/api/admin/spend-experiences', {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('GET /api/admin/spend-experiences', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when not admin', async () => {
    mockRequireAdmin.mockResolvedValue({ isValid: false });
    const res = await GET(jsonRequest('GET', undefined, 'user@example.com'));
    const j = await res.json();
    expect(res.status).toBe(403);
    expect(j.success).toBe(false);
    expect(mockListSpendExperiences).not.toHaveBeenCalled();
  });

  it('returns list for admin', async () => {
    mockRequireAdmin.mockResolvedValue({
      isValid: true,
      user: { email: 'admin@example.com' },
    });
    mockListSpendExperiences.mockResolvedValue([
      {
        id: 'uuid-1',
        title: 'Test',
        description: null,
        event_id: null,
        status: 'draft',
        points_to_usdc_rate: 1000,
        max_usdc_per_user: 5,
        treasury_wallet_address: '0x1111111111111111111111111111111111111111',
        receiving_wallet_address: '0x2222222222222222222222222222222222222222',
        start_time: '2026-05-01T00:00:00Z',
        end_time: '2026-05-02T00:00:00Z',
        created_by: 'admin@example.com',
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z',
      },
    ]);

    const res = await GET(jsonRequest('GET', undefined, 'admin@example.com'));
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.success).toBe(true);
    expect(j.data.spendExperiences).toHaveLength(1);
  });
});

describe('POST /api/admin/spend-experiences', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 on validation failure', async () => {
    mockRequireAdmin.mockResolvedValue({
      isValid: true,
      user: { email: 'admin@example.com' },
    });

    const res = await POST(
      jsonRequest(
        'POST',
        {
          title: '',
          points_to_usdc_rate: 1000,
          max_usdc_per_user: 5,
          treasury_wallet_address: '0x1111111111111111111111111111111111111111',
          receiving_wallet_address:
            '0x2222222222222222222222222222222222222222',
          start_time: '2026-05-01T12:00:00.000Z',
          end_time: '2026-05-08T12:00:00.000Z',
        },
        'admin@example.com'
      )
    );
    const j = await res.json();
    expect(res.status).toBe(400);
    expect(j.success).toBe(false);
    expect(mockCreateSpendExperience).not.toHaveBeenCalled();
  });

  it('returns 403 when not admin', async () => {
    mockRequireAdmin.mockResolvedValue({ isValid: false });
    const res = await POST(
      jsonRequest(
        'POST',
        {
          title: 'Ok',
          points_to_usdc_rate: 1000,
          max_usdc_per_user: 5,
          treasury_wallet_address: '0x1111111111111111111111111111111111111111',
          receiving_wallet_address:
            '0x2222222222222222222222222222222222222222',
          start_time: '2026-05-01T12:00:00.000Z',
          end_time: '2026-05-08T12:00:00.000Z',
        },
        'x@y.com'
      )
    );
    expect(res.status).toBe(403);
    expect(mockCreateSpendExperience).not.toHaveBeenCalled();
  });
});

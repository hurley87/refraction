import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetCityMetrics = vi.fn();
const mockVerifyAuthToken = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/db/locations', () => ({
  getCityMetrics: (...args: unknown[]) => mockGetCityMetrics(...args),
}));

vi.mock('@/lib/api/privy', () => ({
  getPrivyClient: () => ({
    verifyAuthToken: (...args: unknown[]) => mockVerifyAuthToken(...args),
    getUser: (...args: unknown[]) => mockGetUser(...args),
  }),
}));

import { GET } from '../route';

function createRequest(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader) {
    headers.set('authorization', authHeader);
  }

  return new NextRequest('http://localhost:3000/api/admin/city-metrics', {
    method: 'GET',
    headers,
  });
}

describe('GET /api/admin/city-metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 when authorization token is missing', async () => {
    const response = await GET(createRequest());
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Unauthorized');
    expect(mockGetCityMetrics).not.toHaveBeenCalled();
  });

  it('returns 403 when token verification fails', async () => {
    mockVerifyAuthToken.mockRejectedValue(new Error('invalid token'));

    const response = await GET(createRequest('Bearer invalid-token'));
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Unauthorized');
    expect(mockGetCityMetrics).not.toHaveBeenCalled();
  });

  it('returns 403 for authenticated non-admin users', async () => {
    mockVerifyAuthToken.mockResolvedValue({ userId: 'privy_user_123' });
    mockGetUser.mockResolvedValue({
      email: { address: 'not-admin@example.com' },
    });

    const response = await GET(createRequest('Bearer valid-token'));
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Unauthorized');
    expect(mockGetCityMetrics).not.toHaveBeenCalled();
  });

  it('returns metrics for authenticated admins', async () => {
    mockVerifyAuthToken.mockResolvedValue({ userId: 'privy_admin_123' });
    mockGetUser.mockResolvedValue({
      email: { address: 'dhurls99@gmail.com' },
    });
    mockGetCityMetrics.mockResolvedValue([
      {
        city: 'New York City',
        total_spots: 12,
        visible_spots: 10,
        latest_spot_at: '2026-04-01T00:00:00Z',
      },
      {
        city: 'Toronto',
        total_spots: 8,
        visible_spots: 7,
        latest_spot_at: '2026-04-02T00:00:00Z',
      },
    ]);

    const response = await GET(createRequest('Bearer valid-admin-token'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.metrics).toHaveLength(2);
    expect(json.data.cities_with_10_plus_spots).toBe(1);
  });

  it('returns 500 when metrics fetch fails', async () => {
    mockVerifyAuthToken.mockResolvedValue({ userId: 'privy_admin_123' });
    mockGetUser.mockResolvedValue({
      email: { address: 'dhurls99@gmail.com' },
    });
    mockGetCityMetrics.mockRejectedValue(new Error('database failure'));

    const response = await GET(createRequest('Bearer valid-admin-token'));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Failed to fetch city metrics');
  });
});

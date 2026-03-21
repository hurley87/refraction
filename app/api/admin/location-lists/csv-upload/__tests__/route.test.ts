import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  verifyAuthToken: vi.fn(),
  getUser: vi.fn(),
  checkAdminPermission: vi.fn(),
}));

vi.mock('@/lib/api/privy', () => ({
  getPrivyClient: vi.fn(() => ({
    verifyAuthToken: mocks.verifyAuthToken,
    getUser: mocks.getUser,
  })),
}));

vi.mock('@/lib/db/admin', () => ({
  checkAdminPermission: mocks.checkAdminPermission,
}));

vi.mock('@/lib/db/client', () => ({
  supabase: {},
}));

import { POST } from '../route';
import { getPrivyClient } from '@/lib/api/privy';

function createRequest(headers: HeadersInit = {}) {
  return new NextRequest('http://localhost:3000/api/admin/location-lists/csv-upload', {
    method: 'POST',
    headers,
  });
}

describe('POST /api/admin/location-lists/csv-upload auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = 'test-mapbox-token';
  });

  it('returns 403 when authorization header is missing', async () => {
    const res = await POST(
      createRequest({ 'x-user-email': 'dhurls99@gmail.com' })
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe('Unauthorized');
    expect(getPrivyClient).not.toHaveBeenCalled();
  });

  it('returns 403 when bearer token is invalid', async () => {
    mocks.verifyAuthToken.mockRejectedValueOnce(new Error('invalid token'));

    const res = await POST(
      createRequest({
        authorization: 'Bearer bad-token',
      })
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe('Unauthorized');
    expect(getPrivyClient).toHaveBeenCalledTimes(1);
  });

  it('returns 403 when authenticated user is not an admin', async () => {
    mocks.verifyAuthToken.mockResolvedValueOnce({
      userId: 'did:privy:user_123',
    });
    mocks.getUser.mockResolvedValueOnce({
      email: { address: 'not-admin@example.com' },
    });
    mocks.checkAdminPermission.mockReturnValueOnce(false);

    const res = await POST(
      createRequest({
        authorization: 'Bearer valid-token',
      })
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe('Unauthorized');
    expect(mocks.checkAdminPermission).toHaveBeenCalledWith(
      'not-admin@example.com'
    );
  });

  it('accepts a valid admin token and proceeds to route validation', async () => {
    delete process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    mocks.verifyAuthToken.mockResolvedValueOnce({
      userId: 'did:privy:admin_123',
    });
    mocks.getUser.mockResolvedValueOnce({
      email: { address: 'dhurls99@gmail.com' },
    });
    mocks.checkAdminPermission.mockReturnValueOnce(true);

    const res = await POST(
      createRequest({
        authorization: 'Bearer valid-admin-token',
      })
    );
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('Mapbox token not configured');
  });
});

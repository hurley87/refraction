import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockDeleteLocationById = vi.fn();
const mockUpdateLocationById = vi.fn();
const mockVerifyAuthToken = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/db/locations', () => ({
  deleteLocationById: (...args: unknown[]) => mockDeleteLocationById(...args),
  updateLocationById: (...args: unknown[]) => mockUpdateLocationById(...args),
}));

vi.mock('@/lib/api/privy', () => ({
  getPrivyClient: () => ({
    verifyAuthToken: (...args: unknown[]) => mockVerifyAuthToken(...args),
    getUser: (...args: unknown[]) => mockGetUser(...args),
  }),
}));

import { DELETE, PATCH } from '../route';

function createDeleteRequest(
  locationId: string,
  options?: { authHeader?: string; userEmailHeader?: string }
): NextRequest {
  const headers = new Headers();
  if (options?.authHeader) {
    headers.set('authorization', options.authHeader);
  }
  if (options?.userEmailHeader) {
    headers.set('x-user-email', options.userEmailHeader);
  }

  return new NextRequest(
    `http://localhost:3000/api/admin/locations/${locationId}`,
    {
      method: 'DELETE',
      headers,
    }
  );
}

function createPatchRequest(
  locationId: string,
  body: Record<string, unknown>,
  options?: { authHeader?: string; userEmailHeader?: string }
): NextRequest {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  if (options?.authHeader) {
    headers.set('authorization', options.authHeader);
  }
  if (options?.userEmailHeader) {
    headers.set('x-user-email', options.userEmailHeader);
  }

  return new NextRequest(
    `http://localhost:3000/api/admin/locations/${locationId}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    }
  );
}

describe('PATCH /api/admin/locations/[locationId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 when token is missing even if x-user-email is admin', async () => {
    const request = createPatchRequest(
      '42',
      { isVisible: true },
      {
        userEmailHeader: 'dhurls99@gmail.com',
      }
    );
    const response = await PATCH(request, { params: { locationId: '42' } });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Unauthorized');
    expect(mockUpdateLocationById).not.toHaveBeenCalled();
  });

  it('returns 403 for verified non-admin users', async () => {
    mockVerifyAuthToken.mockResolvedValue({ userId: 'privy_user_123' });
    mockGetUser.mockResolvedValue({
      email: { address: 'not-admin@example.com' },
    });

    const request = createPatchRequest(
      '42',
      { isVisible: true },
      { authHeader: 'Bearer valid-non-admin-token' }
    );
    const response = await PATCH(request, { params: { locationId: '42' } });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Unauthorized');
    expect(mockUpdateLocationById).not.toHaveBeenCalled();
  });

  it('returns 200 and updates when verified admin token is present', async () => {
    mockVerifyAuthToken.mockResolvedValue({ userId: 'privy_admin_123' });
    mockGetUser.mockResolvedValue({
      email: { address: 'dhurls99@gmail.com' },
    });
    const updatedRow = { id: 42, is_visible: true };
    mockUpdateLocationById.mockResolvedValue(updatedRow);

    const request = createPatchRequest(
      '42',
      { isVisible: true },
      { authHeader: 'Bearer valid-admin-token' }
    );
    const response = await PATCH(request, { params: { locationId: '42' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.location).toEqual(updatedRow);
    expect(mockUpdateLocationById).toHaveBeenCalledWith(42, {
      is_visible: true,
    });
  });
});

describe('DELETE /api/admin/locations/[locationId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 when token is missing even if x-user-email is admin', async () => {
    const request = createDeleteRequest('42', {
      userEmailHeader: 'dhurls99@gmail.com',
    });
    const response = await DELETE(request, { params: { locationId: '42' } });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Unauthorized');
    expect(mockDeleteLocationById).not.toHaveBeenCalled();
  });

  it('returns 403 for verified non-admin users', async () => {
    mockVerifyAuthToken.mockResolvedValue({ userId: 'privy_user_123' });
    mockGetUser.mockResolvedValue({
      email: { address: 'not-admin@example.com' },
    });

    const request = createDeleteRequest('42', {
      authHeader: 'Bearer valid-non-admin-token',
    });
    const response = await DELETE(request, { params: { locationId: '42' } });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Unauthorized');
    expect(mockDeleteLocationById).not.toHaveBeenCalled();
  });

  it('returns 200 and deletes when verified admin token is present', async () => {
    mockVerifyAuthToken.mockResolvedValue({ userId: 'privy_admin_123' });
    mockGetUser.mockResolvedValue({
      email: { address: 'dhurls99@gmail.com' },
    });
    mockDeleteLocationById.mockResolvedValue(true);

    const request = createDeleteRequest('42', {
      authHeader: 'Bearer valid-admin-token',
    });
    const response = await DELETE(request, { params: { locationId: '42' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.deleted).toBe(true);
    expect(mockDeleteLocationById).toHaveBeenCalledWith(42);
  });
});

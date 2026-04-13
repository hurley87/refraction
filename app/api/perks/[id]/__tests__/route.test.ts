import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockVerifyAuthToken = vi.fn();
const mockGetUser = vi.fn();
const mockEqDelete = vi.fn();
const mockDelete = vi.fn(() => ({ eq: mockEqDelete }));
const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockEqUpdate = vi.fn(() => ({ select: mockSelect }));
const mockUpdate = vi.fn(() => ({ eq: mockEqUpdate }));
const mockFrom = vi.fn(() => ({
  update: mockUpdate,
  delete: mockDelete,
}));

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock('@/lib/api/privy', () => ({
  getPrivyClient: () => ({
    verifyAuthToken: (...args: unknown[]) => mockVerifyAuthToken(...args),
    getUser: (...args: unknown[]) => mockGetUser(...args),
  }),
}));

import { PATCH, DELETE } from '../route';

function createPatchRequest(
  perkId: string,
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
  return new NextRequest(`http://localhost:3000/api/perks/${perkId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
}

function createDeleteRequest(
  perkId: string,
  options?: { authHeader?: string; userEmailHeader?: string }
): NextRequest {
  const headers = new Headers();
  if (options?.authHeader) {
    headers.set('authorization', options.authHeader);
  }
  if (options?.userEmailHeader) {
    headers.set('x-user-email', options.userEmailHeader);
  }
  return new NextRequest(`http://localhost:3000/api/perks/${perkId}`, {
    method: 'DELETE',
    headers,
  });
}

describe('PATCH /api/perks/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 when token is missing even if x-user-email is admin', async () => {
    const request = createPatchRequest(
      'perk-1',
      { title: 'Hacked' },
      { userEmailHeader: 'dhurls99@gmail.com' }
    );
    const response = await PATCH(request, { params: { id: 'perk-1' } });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Unauthorized');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 403 for verified non-admin users', async () => {
    mockVerifyAuthToken.mockResolvedValue({ userId: 'privy_user_123' });
    mockGetUser.mockResolvedValue({
      email: { address: 'not-admin@example.com' },
    });

    const request = createPatchRequest(
      'perk-1',
      { title: 'X' },
      { authHeader: 'Bearer valid-non-admin-token' }
    );
    const response = await PATCH(request, { params: { id: 'perk-1' } });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 200 when verified admin token is present', async () => {
    mockVerifyAuthToken.mockResolvedValue({ userId: 'privy_admin_123' });
    mockGetUser.mockResolvedValue({
      email: { address: 'dhurls99@gmail.com' },
    });
    const updated = { id: 'perk-1', title: 'Updated' };
    mockSingle.mockResolvedValue({ data: updated, error: null });

    const request = createPatchRequest(
      'perk-1',
      { title: 'Updated' },
      { authHeader: 'Bearer valid-admin-token' }
    );
    const response = await PATCH(request, { params: { id: 'perk-1' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.perk).toEqual(updated);
    expect(mockFrom).toHaveBeenCalledWith('perks');
    expect(mockUpdate).toHaveBeenCalledWith({ title: 'Updated' });
  });
});

describe('DELETE /api/perks/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 when token is missing even if x-user-email is admin', async () => {
    const request = createDeleteRequest('perk-1', {
      userEmailHeader: 'dhurls99@gmail.com',
    });
    const response = await DELETE(request, { params: { id: 'perk-1' } });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Unauthorized');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 403 for verified non-admin users', async () => {
    mockVerifyAuthToken.mockResolvedValue({ userId: 'privy_user_123' });
    mockGetUser.mockResolvedValue({
      email: { address: 'not-admin@example.com' },
    });

    const request = createDeleteRequest('perk-1', {
      authHeader: 'Bearer valid-non-admin-token',
    });
    const response = await DELETE(request, { params: { id: 'perk-1' } });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 200 when verified admin token is present', async () => {
    mockVerifyAuthToken.mockResolvedValue({ userId: 'privy_admin_123' });
    mockGetUser.mockResolvedValue({
      email: { address: 'dhurls99@gmail.com' },
    });
    mockEqDelete.mockResolvedValue({ error: null });

    const request = createDeleteRequest('perk-1', {
      authHeader: 'Bearer valid-admin-token',
    });
    const response = await DELETE(request, { params: { id: 'perk-1' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('perks');
    expect(mockDelete).toHaveBeenCalled();
  });
});

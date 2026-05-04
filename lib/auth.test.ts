import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetPrivyUserEmailFromRequest = vi.fn();

vi.mock('@/lib/api/privy', () => ({
  getPrivyUserEmailFromRequest: (...args: unknown[]) =>
    mockGetPrivyUserEmailFromRequest(...args),
}));

import {
  getUserFromRequest,
  requireAdmin,
  getAuthenticatedAdminEmail,
} from './auth';

describe('lib/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getUserFromRequest returns email from verified Privy helper', async () => {
    mockGetPrivyUserEmailFromRequest.mockResolvedValue('a@b.com');
    const req = new NextRequest('http://localhost/');
    await expect(getUserFromRequest(req)).resolves.toEqual({
      email: 'a@b.com',
    });
  });

  it('getUserFromRequest returns null when token invalid', async () => {
    mockGetPrivyUserEmailFromRequest.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/');
    await expect(getUserFromRequest(req)).resolves.toBeNull();
  });

  it('requireAdmin is valid only for allowlisted admin email', async () => {
    mockGetPrivyUserEmailFromRequest.mockResolvedValue('dhurls99@gmail.com');
    const req = new NextRequest('http://localhost/');
    await expect(requireAdmin(req)).resolves.toEqual({
      isValid: true,
      user: { email: 'dhurls99@gmail.com' },
    });
  });

  it('requireAdmin rejects non-admin verified email', async () => {
    mockGetPrivyUserEmailFromRequest.mockResolvedValue('not@admin.com');
    const req = new NextRequest('http://localhost/');
    await expect(requireAdmin(req)).resolves.toEqual({
      isValid: false,
      user: { email: 'not@admin.com' },
    });
  });

  it('getAuthenticatedAdminEmail returns null for non-admin', async () => {
    mockGetPrivyUserEmailFromRequest.mockResolvedValue('x@y.com');
    const req = new NextRequest('http://localhost/');
    await expect(getAuthenticatedAdminEmail(req)).resolves.toBeNull();
  });
});

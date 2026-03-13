import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api/privy', () => ({
  verifyWalletOwnership: vi.fn(),
}));

import { GET, POST } from '../route';
import { verifyWalletOwnership } from '@/lib/api/privy';

const validWallet = '0x1234567890abcdef1234567890abcdef12345678';

function createPostRequest(body: unknown, withAuthHeader = true) {
  return new NextRequest('http://localhost:3000/api/claim-nft', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(withAuthHeader ? { Authorization: 'Bearer token' } : {}),
    },
    body: JSON.stringify(body),
  });
}

function createGetRequest(walletAddress: string, withAuthHeader = true) {
  return new NextRequest(
    `http://localhost:3000/api/claim-nft?userAddress=${walletAddress}`,
    {
      method: 'GET',
      headers: withAuthHeader ? { Authorization: 'Bearer token' } : {},
    }
  );
}

describe('/api/claim-nft auth guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when POST is missing wallet address', async () => {
    const req = createPostRequest({});
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('User address is required');
    expect(verifyWalletOwnership).not.toHaveBeenCalled();
  });

  it('returns 401 when POST caller does not own wallet', async () => {
    vi.mocked(verifyWalletOwnership).mockResolvedValue({
      authorized: false,
      error: 'Unauthorized',
    });

    const req = createPostRequest({ userAddress: validWallet });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
    expect(verifyWalletOwnership).toHaveBeenCalledWith(req, validWallet);
  });

  it('returns 401 when GET caller does not own wallet', async () => {
    vi.mocked(verifyWalletOwnership).mockResolvedValue({
      authorized: false,
      error: 'Unauthorized',
    });

    const req = createGetRequest(validWallet);
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
    expect(verifyWalletOwnership).toHaveBeenCalledWith(req, validWallet);
  });
});

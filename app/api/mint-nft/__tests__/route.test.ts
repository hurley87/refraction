import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api/privy', () => ({
  verifyWalletOwnership: vi.fn(),
}));

vi.mock('@/lib/stellar/utils/soroban', () => ({
  addressToScVal: vi.fn(),
  getContract: vi.fn(),
  getSorobanRpc: vi.fn(),
  isValidAddress: vi.fn((address: string) => address.startsWith('G')),
}));

vi.mock('@/lib/stellar/utils/network', () => ({
  getHorizonUrlForNetwork: vi.fn(() => 'https://horizon-testnet.stellar.org'),
  getNFTContractAddress: vi.fn(() => 'CDUMMYNFTCONTRACTADDRESS'),
}));

import { POST } from '../route';
import { verifyWalletOwnership } from '@/lib/api/privy';

const validStellarWallet =
  'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';

function createPostRequest(
  body: unknown,
  withAuthHeader = true
): NextRequest {
  return new NextRequest('http://localhost:3000/api/mint-nft', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(withAuthHeader ? { Authorization: 'Bearer token' } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('/api/mint-nft auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when walletAddress is missing', async () => {
    const req = createPostRequest({});
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('walletAddress is required');
    expect(verifyWalletOwnership).not.toHaveBeenCalled();
  });

  it('returns 401 when caller does not own wallet', async () => {
    vi.mocked(verifyWalletOwnership).mockResolvedValue({
      authorized: false,
      error: 'Unauthorized',
    });

    const req = createPostRequest({
      walletAddress: validStellarWallet,
      networkPassphrase: 'Test SDF Network ; September 2015',
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
    expect(verifyWalletOwnership).toHaveBeenCalledWith(req, validStellarWallet);
  });
});

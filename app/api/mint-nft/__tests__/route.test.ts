import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  verifyWalletOwnershipMock,
  isValidAddressMock,
  getNFTContractAddressMock,
} = vi.hoisted(() => ({
  verifyWalletOwnershipMock: vi.fn(),
  isValidAddressMock: vi.fn(),
  getNFTContractAddressMock: vi.fn(),
}));

vi.mock('@/lib/api/privy', () => ({
  verifyWalletOwnership: verifyWalletOwnershipMock,
}));

vi.mock('@/lib/stellar/utils/soroban', () => ({
  addressToScVal: vi.fn(),
  getContract: vi.fn(),
  getSorobanRpc: vi.fn(),
  isValidAddress: isValidAddressMock,
}));

vi.mock('@/lib/stellar/utils/network', () => ({
  getHorizonUrlForNetwork: vi.fn(),
  getNFTContractAddress: getNFTContractAddressMock,
}));

vi.mock('@stellar/stellar-sdk', () => ({
  Keypair: {
    fromSecret: vi.fn(),
  },
  Networks: {
    PUBLIC: 'Public Global Stellar Network ; September 2015',
    TESTNET: 'Test SDF Network ; September 2015',
  },
  TransactionBuilder: vi.fn(),
  Horizon: {
    Server: vi.fn(),
  },
  rpc: {
    Api: {
      isSimulationError: vi.fn(),
    },
  },
  scValToNative: vi.fn(),
}));

import { POST } from '../route';
import { verifyWalletOwnership } from '@/lib/api/privy';

function createPostRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/mint-nft', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
    },
    body: JSON.stringify(body),
  });
}

describe('/api/mint-nft auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isValidAddressMock.mockReturnValue(true);
    verifyWalletOwnershipMock.mockResolvedValue({ authorized: true });
    getNFTContractAddressMock.mockReturnValue('C123');
  });

  it('returns 400 when walletAddress is missing', async () => {
    const req = createPostRequest({});
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('walletAddress is required');
    expect(verifyWalletOwnership).not.toHaveBeenCalled();
  });

  it('returns 400 when walletAddress is invalid', async () => {
    isValidAddressMock.mockReturnValue(false);

    const req = createPostRequest({ walletAddress: 'not-a-stellar-address' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid wallet address');
    expect(verifyWalletOwnership).not.toHaveBeenCalled();
  });

  it('returns 401 when caller does not own the wallet', async () => {
    const walletAddress =
      'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
    verifyWalletOwnershipMock.mockResolvedValue({
      authorized: false,
      error: 'Unauthorized',
    });

    const req = createPostRequest({ walletAddress });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
    expect(verifyWalletOwnership).toHaveBeenCalledWith(req, walletAddress);
  });
});

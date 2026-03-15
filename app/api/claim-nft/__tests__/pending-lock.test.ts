import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockReadContract = vi.fn();
const mockWaitForTransactionReceipt = vi.fn();
const mockWriteContract = vi.fn();

vi.mock('@/lib/api/privy', () => ({
  verifyWalletOwnership: vi.fn(),
}));

vi.mock('viem', () => ({
  createPublicClient: vi.fn(() => ({
    readContract: mockReadContract,
    waitForTransactionReceipt: mockWaitForTransactionReceipt,
  })),
  createWalletClient: vi.fn(() => ({
    writeContract: mockWriteContract,
  })),
  http: vi.fn(() => ({})),
  parseAbi: vi.fn((abi) => abi),
}));

vi.mock('viem/chains', () => ({
  base: {},
}));

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn(() => ({ address: '0xserver' })),
}));

vi.mock('@/lib/reward1155-abi', () => ({
  REWARD1155_ADDRESS: '0x0000000000000000000000000000000000000001',
  REWARD1155_ABI: [
    'function canMint(address) view returns (bool)',
    'function hasMinted(address) view returns (bool)',
    'function mintTo(address)',
    'function balanceOf(address,uint256) view returns (uint256)',
    'function rewardToken() view returns (address)',
    'function rewardAmount() view returns (uint256)',
  ],
  ERC20_ABI: ['function balanceOf(address) view returns (uint256)'],
}));

const validWallet = '0x1234567890abcdef1234567890abcdef12345678';
const txHash = `0x${'a'.repeat(64)}`;

function createPostRequest() {
  return new NextRequest('http://localhost:3000/api/claim-nft', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
    },
    body: JSON.stringify({ userAddress: validWallet }),
  });
}

describe('/api/claim-nft pending mint guard', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    process.env.SERVER_PRIVATE_KEY = `0x${'1'.repeat(64)}`;
    process.env.NEXT_PUBLIC_BASE_RPC = 'https://example-rpc.invalid';
  });

  it('blocks a second mint request while first tx is pending', async () => {
    const { verifyWalletOwnership } = await import('@/lib/api/privy');
    vi.mocked(verifyWalletOwnership).mockResolvedValue({ authorized: true });

    mockReadContract.mockResolvedValue(true);
    mockWriteContract.mockResolvedValue(txHash);
    mockWaitForTransactionReceipt.mockRejectedValue({
      name: 'WaitForTransactionReceiptTimeoutError',
    });

    const { POST } = await import('../route');

    const firstResponse = await POST(createPostRequest());
    const firstJson = await firstResponse.json();

    expect(firstResponse.status).toBe(202);
    expect(firstJson.pending).toBe(true);
    expect(firstJson.transactionHash).toBe(txHash);

    const secondResponse = await POST(createPostRequest());
    const secondJson = await secondResponse.json();

    expect(secondResponse.status).toBe(429);
    expect(secondJson.error).toContain('pending confirmation');
    expect(secondJson.transactionHash).toBe(txHash);
    expect(mockWriteContract).toHaveBeenCalledTimes(1);
  });
});

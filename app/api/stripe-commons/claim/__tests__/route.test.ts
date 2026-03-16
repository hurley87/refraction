import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockReadContract = vi.fn();
const mockWaitForTransactionReceipt = vi.fn();
const mockWriteContract = vi.fn();
const mockPointsActivitiesInsert = vi.fn();
const mockUpdatePlayerPoints = vi.fn();

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
  privateKeyToAccount: vi.fn(() => ({
    address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  })),
}));

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table !== 'points_activities') {
        throw new Error(`Unexpected table in test: ${table}`);
      }

      const result = { data: [], error: null };
      const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        limit: vi.fn(() => query),
        insert: mockPointsActivitiesInsert,
        then: (onFulfilled: (value: typeof result) => unknown) =>
          Promise.resolve(result).then(onFulfilled),
      };

      return query;
    }),
  },
}));

vi.mock('@/lib/db/players', () => ({
  getPlayerByWallet: vi.fn(),
  createOrUpdatePlayer: vi.fn(),
  updatePlayerPoints: mockUpdatePlayerPoints,
}));

const validWallet = '0x1234567890abcdef1234567890abcdef12345678';
const txHash = `0x${'a'.repeat(64)}`;

function createPostRequest() {
  return new NextRequest('http://localhost:3000/api/stripe-commons/claim', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
    },
    body: JSON.stringify({ userAddress: validWallet }),
  });
}

describe('/api/stripe-commons/claim confirmation safety', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    process.env.SERVER_PRIVATE_KEY = `0x${'1'.repeat(64)}`;
    process.env.NEXT_PUBLIC_BASE_RPC = 'https://example-rpc.invalid';

    mockPointsActivitiesInsert.mockResolvedValue({ error: null });
  });

  it('does not persist claim while transaction is still pending', async () => {
    const { verifyWalletOwnership } = await import('@/lib/api/privy');
    vi.mocked(verifyWalletOwnership).mockResolvedValue({ authorized: true });

    mockReadContract.mockResolvedValue(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    );
    mockWriteContract.mockResolvedValue(txHash);
    const timeoutError = new Error('timed out');
    timeoutError.name = 'WaitForTransactionReceiptTimeoutError';
    mockWaitForTransactionReceipt.mockRejectedValue(timeoutError);

    const { POST } = await import('../route');

    const firstResponse = await POST(createPostRequest());
    const firstJson = await firstResponse.json();

    expect(firstResponse.status).toBe(202);
    expect(firstJson.pending).toBe(true);
    expect(firstJson.transactionHash).toBe(txHash);
    expect(mockPointsActivitiesInsert).not.toHaveBeenCalled();
    expect(mockUpdatePlayerPoints).not.toHaveBeenCalled();

    const secondResponse = await POST(createPostRequest());
    const secondJson = await secondResponse.json();

    expect(secondResponse.status).toBe(429);
    expect(secondJson.error).toContain('pending confirmation');
    expect(secondJson.transactionHash).toBe(txHash);
    expect(mockWriteContract).toHaveBeenCalledTimes(1);
  });
});

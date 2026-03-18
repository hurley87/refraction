import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockReadContract = vi.fn();
const mockWaitForTransactionReceipt = vi.fn();
const mockWriteContract = vi.fn();
const mockPointsActivitiesInsert = vi.fn();
const mockGetPlayerByWallet = vi.fn();
const mockCreateOrUpdatePlayer = vi.fn();
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
  getPlayerByWallet: mockGetPlayerByWallet,
  createOrUpdatePlayer: mockCreateOrUpdatePlayer,
  updatePlayerPoints: mockUpdatePlayerPoints,
}));

const custodianWallet = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const validWallet = '0x1234567890abcdef1234567890abcdef12345678';
const secondWallet = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const txHash = `0x${'a'.repeat(64)}`;

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createPostRequest(userAddress: string = validWallet) {
  return new NextRequest('http://localhost:3000/api/stripe-commons/claim', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
    },
    body: JSON.stringify({ userAddress }),
  });
}

describe('/api/stripe-commons/claim confirmation safety', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    process.env.SERVER_PRIVATE_KEY = `0x${'1'.repeat(64)}`;
    process.env.NEXT_PUBLIC_BASE_RPC = 'https://example-rpc.invalid';

    mockPointsActivitiesInsert.mockResolvedValue({ error: null });
    mockGetPlayerByWallet.mockResolvedValue(null);
    mockCreateOrUpdatePlayer.mockResolvedValue(null);
  });

  it('does not persist claim while transaction is still pending', async () => {
    const { verifyWalletOwnership } = await import('@/lib/api/privy');
    vi.mocked(verifyWalletOwnership).mockResolvedValue({ authorized: true });

    mockReadContract.mockResolvedValue(custodianWallet);
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

  it('recovers pending claims once confirmation arrives', async () => {
    const { verifyWalletOwnership } = await import('@/lib/api/privy');
    vi.mocked(verifyWalletOwnership).mockResolvedValue({ authorized: true });

    mockReadContract.mockResolvedValue(custodianWallet);
    mockWriteContract.mockResolvedValue(txHash);

    const timeoutError = new Error('timed out');
    timeoutError.name = 'WaitForTransactionReceiptTimeoutError';
    mockWaitForTransactionReceipt
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce({ status: 'success' });

    const { POST } = await import('../route');

    const firstResponse = await POST(createPostRequest());
    expect(firstResponse.status).toBe(202);

    const secondResponse = await POST(createPostRequest());
    const secondJson = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondJson.recoveredPendingClaim).toBe(true);
    expect(secondJson.transactionHash).toBe(txHash);
    expect(mockPointsActivitiesInsert).toHaveBeenCalledTimes(1);
    expect(mockWriteContract).toHaveBeenCalledTimes(1);
  });

  it('serializes pending claim recovery to avoid duplicate point awards', async () => {
    const { verifyWalletOwnership } = await import('@/lib/api/privy');
    vi.mocked(verifyWalletOwnership).mockResolvedValue({ authorized: true });

    mockReadContract.mockResolvedValue(custodianWallet);
    mockWriteContract.mockResolvedValue(txHash);

    const timeoutError = new Error('timed out');
    timeoutError.name = 'WaitForTransactionReceiptTimeoutError';
    mockWaitForTransactionReceipt.mockRejectedValueOnce(timeoutError);

    const { POST } = await import('../route');

    const firstResponse = await POST(createPostRequest());
    expect(firstResponse.status).toBe(202);

    const pendingReceipt = createDeferred<{ status: 'success' }>();
    mockWaitForTransactionReceipt.mockImplementationOnce(
      () => pendingReceipt.promise
    );

    const recoveryPromise = POST(createPostRequest());
    await Promise.resolve();

    const blockedResponse = await POST(createPostRequest());
    const blockedJson = await blockedResponse.json();
    expect(blockedResponse.status).toBe(429);
    expect(blockedJson.error).toContain('Claim already in progress');

    pendingReceipt.resolve({ status: 'success' });
    const recoveredResponse = await recoveryPromise;
    expect(recoveredResponse.status).toBe(200);
    expect(mockPointsActivitiesInsert).toHaveBeenCalledTimes(1);
    expect(mockUpdatePlayerPoints).toHaveBeenCalledTimes(0);
  });

  it('skips transferred tokens missing from claim records', async () => {
    const { verifyWalletOwnership } = await import('@/lib/api/privy');
    vi.mocked(verifyWalletOwnership).mockResolvedValue({ authorized: true });

    mockReadContract.mockImplementation(({ args }: { args: [bigint] }) => {
      const tokenId = Number(args[0]);
      if (tokenId === 1) {
        return Promise.resolve('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
      }
      return Promise.resolve(custodianWallet);
    });

    mockWriteContract.mockResolvedValue(txHash);
    mockWaitForTransactionReceipt.mockResolvedValue({ status: 'success' });

    const { POST } = await import('../route');

    const response = await POST(createPostRequest(secondWallet));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.tokenId).toBe(2);
    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [custodianWallet, secondWallet, 2n],
      })
    );
    expect(mockPointsActivitiesInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          token_id: 2,
        }),
      })
    );
  });
});

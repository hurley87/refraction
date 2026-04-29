import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPrivyRpc = vi.fn();
const mockGetTransaction = vi.fn();
const mockGetBlockNumber = vi.fn();
const mockGetLogs = vi.fn();

vi.mock('@privy-io/server-auth', () => ({
  PrivyClient: vi.fn(function PrivyClient() {
    return {
      walletApi: {
        rpc: mockPrivyRpc,
        getTransaction: mockGetTransaction,
      },
    };
  }),
}));

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>();
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      getBlockNumber: mockGetBlockNumber,
      getLogs: mockGetLogs,
    })),
  };
});

import { submitTreasuryUsdcTransfer } from './spend-treasury-usdc-transfer';

const txHash =
  '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';

describe('submitTreasuryUsdcTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'app-id';
    process.env.PRIVY_APP_SECRET = 'app-secret';
    mockGetBlockNumber.mockResolvedValue(123n);
    mockGetLogs.mockResolvedValue([]);
  });

  it('uses Privy RPC transaction ids to recover hashes for sponsored sends', async () => {
    mockPrivyRpc.mockResolvedValue({
      method: 'eth_sendTransaction',
      data: {
        hash: '',
        caip2: 'eip155:8453',
        transaction_id: 'privy-tx-1',
      },
    });
    mockGetTransaction.mockResolvedValue({
      id: 'privy-tx-1',
      status: 'confirmed',
      transactionHash: txHash,
    });

    await expect(
      submitTreasuryUsdcTransfer({
        serverWalletId: 'wallet-1',
        serverWalletAddress: '0x1111111111111111111111111111111111111111',
        recipientAddress: '0x2222222222222222222222222222222222222222',
        usdcAmount: 1,
      })
    ).resolves.toEqual({ ok: true, txHash });

    expect(mockPrivyRpc).toHaveBeenCalledWith(
      expect.objectContaining({
        walletId: 'wallet-1',
        method: 'eth_sendTransaction',
        sponsor: true,
      })
    );
    expect(mockGetTransaction).toHaveBeenCalledWith({ id: 'privy-tx-1' });
  });
});

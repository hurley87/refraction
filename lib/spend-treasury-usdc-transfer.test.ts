import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSendTransaction = vi.fn();
const mockGetWallet = vi.fn();
const mockGetTransaction = vi.fn();
const mockGetBlockNumber = vi.fn();
const mockGetLogs = vi.fn();

vi.mock('@privy-io/server-auth', () => ({
  PrivyClient: vi.fn(function PrivyClient() {
    return {
      walletApi: {
        ethereum: { sendTransaction: mockSendTransaction },
        getWallet: mockGetWallet,
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

import {
  mapInsufficientNativeGasPrivyError,
  submitTreasuryUsdcTransfer,
} from './spend-treasury-usdc-transfer';

const txHash =
  '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';

describe('submitTreasuryUsdcTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'app-id';
    process.env.PRIVY_APP_SECRET = 'app-secret';
    mockGetBlockNumber.mockResolvedValue(123n);
    mockGetLogs.mockResolvedValue([]);
    mockGetWallet.mockResolvedValue({
      id: 'wallet-1',
      address: '0x1111111111111111111111111111111111111111',
      chainType: 'ethereum',
    });
  });

  it('uses walletApi.ethereum.sendTransaction with sponsor and resolves tx hash', async () => {
    mockSendTransaction.mockResolvedValue({
      hash: txHash,
      caip2: 'eip155:8453',
    });

    await expect(
      submitTreasuryUsdcTransfer({
        serverWalletId: 'wallet-1',
        serverWalletAddress: '0x1111111111111111111111111111111111111111',
        recipientAddress: '0x2222222222222222222222222222222222222222',
        usdcAmount: 1,
      })
    ).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        txHash,
        privySendSummary: expect.any(Object),
      })
    );

    expect(mockGetWallet).toHaveBeenCalledWith({ id: 'wallet-1' });
    expect(mockSendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        walletId: 'wallet-1',
        caip2: 'eip155:8453',
        sponsor: true,
        transaction: expect.objectContaining({
          to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          chainId: 8453,
          value: '0x0',
        }),
      })
    );
    expect(mockGetTransaction).not.toHaveBeenCalled();
  });

  it('uses Privy getTransaction when send returns only a transaction id', async () => {
    mockSendTransaction.mockResolvedValue({
      hash: '',
      caip2: 'eip155:8453',
      transactionId: 'privy-tx-1',
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
        privyHashResolveOptions: { timeoutMs: 100, pollIntervalMs: 1 },
      })
    ).resolves.toEqual(expect.objectContaining({ ok: true, txHash }));

    expect(mockGetTransaction).toHaveBeenCalledWith({ id: 'privy-tx-1' });
  });

  it('returns submittedPending when only Privy id is known after poll timeout', async () => {
    mockSendTransaction.mockResolvedValue({
      transactionId: 'privy-tx-slow',
    });
    mockGetTransaction.mockResolvedValue({
      id: 'privy-tx-slow',
      status: 'broadcasted',
      transactionHash: null,
    });

    await expect(
      submitTreasuryUsdcTransfer({
        serverWalletId: 'wallet-1',
        serverWalletAddress: '0x1111111111111111111111111111111111111111',
        recipientAddress: '0x2222222222222222222222222222222222222222',
        usdcAmount: 1,
        privyHashResolveOptions: { timeoutMs: 50, pollIntervalMs: 5 },
      })
    ).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        submittedPending: true,
        privyTransactionId: 'privy-tx-slow',
      })
    );
  });

  it('rejects when Privy wallet address does not match server_wallet_address', async () => {
    mockGetWallet.mockResolvedValue({
      id: 'wallet-1',
      address: '0x9999999999999999999999999999999999999999',
      chainType: 'ethereum',
    });

    await expect(
      submitTreasuryUsdcTransfer({
        serverWalletId: 'wallet-1',
        serverWalletAddress: '0x1111111111111111111111111111111111111111',
        recipientAddress: '0x2222222222222222222222222222222222222222',
        usdcAmount: 1,
      })
    ).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining('mismatch'),
    });
    expect(mockSendTransaction).not.toHaveBeenCalled();
  });

  it('maps insufficient native gas errors to sponsorship troubleshooting text', () => {
    expect(
      mapInsufficientNativeGasPrivyError(
        'Transaction creation failed. Details: insufficient funds for gas * price + value'
      )
    ).toContain('Privy gas sponsorship was not applied');
  });
});

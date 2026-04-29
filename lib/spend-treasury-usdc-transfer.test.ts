import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetWallet = vi.fn();
const mockSignAndSend = vi.fn();
const mockWaitForTransaction = vi.fn();

const { MockPrivyTimeout } = vi.hoisted(() => {
  class PrivyRestTransactionTimeoutError extends Error {
    lastStatus: string | null = null;
    constructor(public transactionId: string) {
      super(
        `Privy transaction ${transactionId} did not return a final hash within the timeout`
      );
      this.name = 'PrivyRestTransactionTimeoutError';
    }
  }
  return { MockPrivyTimeout: PrivyRestTransactionTimeoutError };
});

vi.mock('@privy-io/server-auth', () => ({
  PrivyClient: vi.fn(function PrivyClient() {
    return {
      walletApi: {
        getWallet: mockGetWallet,
      },
    };
  }),
}));

vi.mock('@/lib/privy-server-rest', () => ({
  signAndSendTransaction: (...args: unknown[]) => mockSignAndSend(...args),
  waitForTransaction: (...args: unknown[]) => mockWaitForTransaction(...args),
  PrivyRestTransactionTimeoutError: MockPrivyTimeout,
  PrivyRestApiError: class extends Error {
    name = 'PrivyRestApiError';
  },
  PrivyRestTransactionFailedError: class extends Error {
    name = 'PrivyRestTransactionFailedError';
  },
  getPrivyRestTransaction: vi.fn(),
}));
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
    mockGetWallet.mockResolvedValue({
      id: 'wallet-1',
      address: '0x1111111111111111111111111111111111111111',
      chainType: 'ethereum',
    });
  });

  it('calls Privy REST sign and wait; empty initial hash is not a failure', async () => {
    mockSignAndSend.mockResolvedValue({
      transactionId: 'privy-tx-1',
      userOperationHash: '0x' + 'a'.repeat(64),
      hash: '',
    });
    mockWaitForTransaction.mockResolvedValue({
      transactionHash: txHash as `0x${string}`,
      status: 'finalized',
      userOperationHash: '0x' + 'a'.repeat(64),
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
        privyTransactionId: 'privy-tx-1',
        privyStatus: 'finalized',
      })
    );

    expect(mockGetWallet).toHaveBeenCalledWith({ id: 'wallet-1' });
    expect(mockSignAndSend).toHaveBeenCalledWith(
      expect.objectContaining({
        walletId: 'wallet-1',
        sponsor: true,
        to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        value: '0x0',
        referenceId: expect.any(String),
      })
    );
    expect((mockSignAndSend.mock.calls[0][0] as { data: string }).data).toMatch(
      /^0x/
    );
    expect(mockWaitForTransaction).toHaveBeenCalledWith(
      'privy-tx-1',
      expect.objectContaining({
        timeoutMs: 30_000,
      })
    );
  });

  it('returns submittedPending when Privy poll times out (30s)', async () => {
    const err = new MockPrivyTimeout('privy-tx-slow');
    err.lastStatus = 'broadcasted';
    mockSignAndSend.mockResolvedValue({
      transactionId: 'privy-tx-slow',
      userOperationHash: null,
      hash: '',
    });
    mockWaitForTransaction.mockRejectedValue(err);

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
        lastPrivyStatus: 'broadcasted',
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
    expect(mockSignAndSend).not.toHaveBeenCalled();
  });

  it('maps insufficient native gas errors to sponsorship troubleshooting text', () => {
    expect(
      mapInsufficientNativeGasPrivyError(
        'Transaction creation failed. Details: insufficient funds for gas * price + value'
      )
    ).toContain('Privy gas sponsorship was not applied');
  });
});

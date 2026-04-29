import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetTransaction = vi.fn();

vi.mock('@privy-io/server-auth', () => ({
  PrivyClient: vi.fn(function PrivyClient() {
    return {
      walletApi: {
        getTransaction: mockGetTransaction,
      },
    };
  }),
}));

import { resolvePrivyServerTransactionHash } from './privy';

const directHash =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const polledHash =
  '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

describe('resolvePrivyServerTransactionHash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'app-id';
    process.env.PRIVY_APP_SECRET = 'app-secret';
  });

  it('returns direct sendTransaction hashes', async () => {
    await expect(
      resolvePrivyServerTransactionHash({ hash: directHash })
    ).resolves.toBe(directHash);
    expect(mockGetTransaction).not.toHaveBeenCalled();
  });

  it('polls Privy transaction ids until the hash is available', async () => {
    mockGetTransaction
      .mockResolvedValueOnce({
        id: 'tx-1',
        status: 'broadcasted',
        transactionHash: null,
      })
      .mockResolvedValueOnce({
        id: 'tx-1',
        status: 'confirmed',
        transactionHash: polledHash,
      });

    await expect(
      resolvePrivyServerTransactionHash(
        { transactionId: 'tx-1' },
        { timeoutMs: 100, pollIntervalMs: 1 }
      )
    ).resolves.toBe(polledHash);

    expect(mockGetTransaction).toHaveBeenCalledWith({ id: 'tx-1' });
    expect(mockGetTransaction).toHaveBeenCalledTimes(2);
  });

  it('throws when Privy marks the transaction failed before returning a hash', async () => {
    mockGetTransaction.mockResolvedValueOnce({
      id: 'tx-1',
      status: 'execution_reverted',
      transactionHash: null,
    });

    await expect(
      resolvePrivyServerTransactionHash(
        { data: { transactionId: 'tx-1' } },
        { timeoutMs: 100, pollIntervalMs: 1 }
      )
    ).rejects.toThrow('execution_reverted');
  });
});

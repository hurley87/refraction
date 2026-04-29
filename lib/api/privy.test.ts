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

import {
  extractPrivyTransactionHash,
  extractPrivyTransactionId,
  resolvePrivyServerTransactionHash,
} from './privy';

const directHash =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const polledHash =
  '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

describe('extractPrivyTransactionHash', () => {
  it('reads txHash and snake_case variants at root and under data', () => {
    const h =
      '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd';
    expect(extractPrivyTransactionHash({ txHash: h })).toBe(h);
    expect(extractPrivyTransactionHash({ tx_hash: h })).toBe(h);
    expect(extractPrivyTransactionHash({ data: { transaction_hash: h } })).toBe(
      h
    );
  });

  it('reads nested receipt and transaction objects', () => {
    const h =
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    expect(
      extractPrivyTransactionHash({
        receipt: { transactionHash: h },
      })
    ).toBe(h);
    expect(
      extractPrivyTransactionHash({
        transaction: { hash: h },
      })
    ).toBe(h);
    expect(
      extractPrivyTransactionHash({
        data: { receipt: { transactionHash: h } },
      })
    ).toBe(h);
  });
});

describe('extractPrivyTransactionId', () => {
  it('prefers explicit transaction id fields over generic id', () => {
    expect(
      extractPrivyTransactionId({
        id: 'wallet-ish-id',
        transactionId: 'tx-abc',
      })
    ).toBe('tx-abc');
  });

  it('uses root id when it is not an EVM tx hash', () => {
    expect(extractPrivyTransactionId({ id: 'privy-internal-1' })).toBe(
      'privy-internal-1'
    );
  });

  it('does not treat 64-hex id as transaction id', () => {
    const looksLikeHash =
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    expect(extractPrivyTransactionId({ id: looksLikeHash })).toBeNull();
  });
});

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

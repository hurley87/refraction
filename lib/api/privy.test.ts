import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetTransaction = vi.fn();
const mockCreateWallet = vi.fn();

vi.mock('@privy-io/server-auth', () => ({
  PrivyClient: vi.fn(function PrivyClient() {
    return {
      walletApi: {
        getTransaction: mockGetTransaction,
        createWallet: mockCreateWallet,
      },
    };
  }),
}));

import {
  createSponsoredActivationPrivyCampaignWallet,
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

describe('createSponsoredActivationPrivyCampaignWallet', () => {
  const createdAt = new Date('2026-04-28T00:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'app-id';
    process.env.PRIVY_APP_SECRET = 'app-secret';
  });

  it('creates a dedicated Solana wallet keyed by the activation idempotency key', async () => {
    mockCreateWallet.mockResolvedValue({
      id: 'pw-sol',
      address: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
      createdAt,
    });

    await expect(
      createSponsoredActivationPrivyCampaignWallet({
        idempotencyKey: 'idem-sol',
        settlementRail: 'solana',
      })
    ).resolves.toEqual({
      privy_campaign_wallet_id: 'pw-sol',
      campaign_wallet_address: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
      campaign_wallet_chain: 'solana-mainnet-beta',
      campaign_wallet_created_at: createdAt.toISOString(),
    });
    expect(mockCreateWallet).toHaveBeenCalledWith({
      chainType: 'solana',
      idempotencyKey: 'idem-sol',
    });
  });

  it('labels the Solana wallet chain with the configured cluster', async () => {
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CLUSTER', 'devnet');
    mockCreateWallet.mockResolvedValue({
      id: 'pw-sol',
      address: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
      createdAt,
    });
    const wallet = await createSponsoredActivationPrivyCampaignWallet({
      idempotencyKey: 'idem-sol-devnet',
      settlementRail: 'solana',
    });
    expect(wallet.campaign_wallet_chain).toBe('solana-devnet');
  });

  it('keeps Base and Tempo on Ethereum wallets', async () => {
    mockCreateWallet.mockResolvedValue({
      id: 'pw-evm',
      address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      createdAt,
    });
    await createSponsoredActivationPrivyCampaignWallet({
      idempotencyKey: 'idem-base',
      settlementRail: 'base',
    });
    await createSponsoredActivationPrivyCampaignWallet({
      idempotencyKey: 'idem-tempo',
      settlementRail: 'tempo',
    });
    expect(mockCreateWallet).toHaveBeenNthCalledWith(1, {
      chainType: 'ethereum',
      idempotencyKey: 'idem-base',
    });
    expect(mockCreateWallet).toHaveBeenNthCalledWith(2, {
      chainType: 'ethereum',
      idempotencyKey: 'idem-tempo',
    });
  });

  it('wraps Privy failures in a Privy-labelled error', async () => {
    mockCreateWallet.mockRejectedValue(new Error('network down'));
    await expect(
      createSponsoredActivationPrivyCampaignWallet({
        idempotencyKey: 'idem-sol',
        settlementRail: 'solana',
      })
    ).rejects.toThrow('Privy campaign wallet could not be created');
  });
});

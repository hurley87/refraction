import { Account } from '@stellar/stellar-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const USER_PUBLIC_KEY =
  'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const RECEIVER_PUBLIC_KEY =
  'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';

const hoisted = vi.hoisted(() => ({
  mockRawSign: vi.fn(),
  mockServer: {
    loadAccount: vi.fn(),
    fetchBaseFee: vi.fn(),
    submitTransaction: vi.fn(),
  },
}));

vi.mock('@/lib/privy-server-rest', () => ({
  privyWalletRawSignTransactionHash: (...args: unknown[]) =>
    hoisted.mockRawSign(...args),
}));

vi.mock('@/lib/spend/stellar-wallet-readiness-config', async () => {
  const { Keypair, Networks } = await import('@stellar/stellar-sdk');
  const sponsor = Keypair.random();
  return {
    createStellarSpendHorizonServer: () => hoisted.mockServer,
    getStellarSpendNetworkPassphrase: () => Networks.TESTNET,
    getStellarSpendUsdcAssetCode: () => 'USDC',
    getStellarSpendUsdcIssuer: () => RECEIVER_PUBLIC_KEY,
    parseStellarSpendSponsorKeypair: () => sponsor,
  };
});

import { submitSponsoredStellarUsdcPaymentFromUser } from './stellar-spend-payment-submit';

describe('submitSponsoredStellarUsdcPaymentFromUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.mockRawSign.mockResolvedValue(Buffer.alloc(64));
    hoisted.mockServer.loadAccount.mockResolvedValue(
      new Account(USER_PUBLIC_KEY, '1')
    );
    hoisted.mockServer.fetchBaseFee.mockResolvedValue(100);
  });

  it('builds sponsored payment operations with the expected source accounts', async () => {
    hoisted.mockServer.submitTransaction.mockRejectedValue(
      Object.assign(new Error('Request failed with status code 400'), {
        response: {
          data: {
            title: 'Transaction Failed',
            extras: {
              result_codes: {
                transaction: 'tx_fee_bump_inner_failed',
                inner_transaction: 'tx_failed',
                operations: ['op_success', 'op_success', 'op_not_sponsored'],
              },
            },
          },
        },
      })
    );

    const result = await submitSponsoredStellarUsdcPaymentFromUser({
      userPublicKey: USER_PUBLIC_KEY,
      privyStellarWalletId: 'stellar-wallet-id',
      destinationPublicKey: RECEIVER_PUBLIC_KEY,
      usdcAmount: 1,
    });

    expect(result.ok).toBe(false);
    const feeBump = hoisted.mockServer.submitTransaction.mock.calls[0]?.[0];
    const operations = feeBump.innerTransaction.operations;
    expect(operations.map((op: { type: string }) => op.type)).toEqual([
      'beginSponsoringFutureReserves',
      'payment',
      'endSponsoringFutureReserves',
    ]);
    expect(operations[0].source).toBe(feeBump.feeSource);
    expect(operations[0].source).not.toBe(USER_PUBLIC_KEY);
    expect(operations[1].source).toBeUndefined();
    expect(operations[2].source).toBe(USER_PUBLIC_KEY);
    expect(result.internalMessage).toContain('tx_fee_bump_inner_failed');
    expect(result.internalMessage).toContain('tx_failed');
    expect(result.internalMessage).toContain('op_not_sponsored');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  getAddress,
  parseAbi,
} from 'viem';

const mockGetWallet = vi.fn();
const mockSignAndSendTempo = vi.fn();
const mockWaitForTransaction = vi.fn();

vi.mock('@/lib/api/privy', () => ({
  getPrivyClient: () => ({
    walletApi: { getWallet: mockGetWallet },
  }),
}));

vi.mock('@/lib/privy-server-rest', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('@/lib/privy-server-rest')>();
  return {
    ...original,
    signAndSendTempoTransaction: (...args: unknown[]) =>
      mockSignAndSendTempo(...args),
    waitForTransaction: (...args: unknown[]) => mockWaitForTransaction(...args),
  };
});

import {
  hasMatchingTempoCaddTransferLog,
  submitTempoCaddTransfer,
  tempoSettlementMemo,
} from '@/lib/activation/tempo-cadd-transfer';
import { TEMPO_CADD_CONTRACT_ADDRESS } from '@/lib/activation/tempo-config';

const campaign = '0x1111111111111111111111111111111111111111';
const venue = '0x2222222222222222222222222222222222222222';
const txHash = `0x${'a'.repeat(64)}` as `0x${string}`;

describe('Tempo CADD transfer adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWallet.mockResolvedValue({ address: campaign });
    mockSignAndSendTempo.mockResolvedValue({
      transactionId: 'privy-tempo-1',
      userOperationHash: null,
      hash: '',
    });
    mockWaitForTransaction.mockResolvedValue({
      transactionHash: txHash,
      status: 'finalized',
      userOperationHash: null,
    });
  });

  it('builds a sponsored native Tempo call with a deterministic full memo', async () => {
    const result = await submitTempoCaddTransfer({
      serverWalletId: 'wallet-1',
      serverWalletAddress: campaign,
      recipientAddress: venue,
      caddAmount: 1.25,
      settlementId: 'settlement-1',
      referenceId: 'activation-settlement:settlement-1',
    });

    expect(result).toMatchObject({
      ok: true,
      txHash,
      privyTransactionId: 'privy-tempo-1',
    });
    expect(tempoSettlementMemo('settlement-1')).toMatch(/^0x[0-9a-f]{64}$/);
    expect(tempoSettlementMemo('settlement-1')).toBe(
      tempoSettlementMemo('settlement-1')
    );

    const send = mockSignAndSendTempo.mock.calls[0][0] as {
      calls: Array<{ to: string; data: `0x${string}` }>;
      sponsor: boolean;
    };
    expect(send.sponsor).toBe(true);
    expect(send.calls[0].to).toBe(TEMPO_CADD_CONTRACT_ADDRESS);
    const decoded = decodeFunctionData({
      abi: parseAbi([
        'function transferWithMemo(address to, uint256 amount, bytes32 memo)',
      ]),
      data: send.calls[0].data,
    });
    expect(decoded.args).toEqual([
      venue,
      1_250_000n,
      tempoSettlementMemo('settlement-1'),
    ]);
  });

  it('rejects a Privy wallet/address mismatch before submission', async () => {
    mockGetWallet.mockResolvedValue({
      address: '0x3333333333333333333333333333333333333333',
    });
    const result = await submitTempoCaddTransfer({
      serverWalletId: 'wallet-1',
      serverWalletAddress: campaign,
      recipientAddress: venue,
      caddAmount: 1,
      settlementId: 'settlement-1',
    });
    expect(result).toMatchObject({ ok: false });
    expect(mockSignAndSendTempo).not.toHaveBeenCalled();
  });

  it('matches all CADD transfer event fields before confirmation', () => {
    const memo = tempoSettlementMemo('settlement-1');
    const eventAbi = parseAbi([
      'event TransferWithMemo(address indexed from, address indexed to, uint256 amount, bytes32 indexed memo)',
    ]);
    const topics = encodeEventTopics({
      abi: eventAbi,
      eventName: 'TransferWithMemo',
      args: { from: campaign, to: venue, memo },
    });
    const log = {
      address: TEMPO_CADD_CONTRACT_ADDRESS,
      topics,
      data: encodeAbiParameters([{ type: 'uint256' }], [1_250_000n]),
    };
    const expected = {
      from: getAddress(campaign),
      to: getAddress(venue),
      amount: 1_250_000n,
      memo,
      caddContract: TEMPO_CADD_CONTRACT_ADDRESS,
    };

    expect(hasMatchingTempoCaddTransferLog([log], expected)).toBe(true);
    expect(
      hasMatchingTempoCaddTransferLog([log], {
        ...expected,
        amount: 1_250_001n,
      })
    ).toBe(false);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Keypair,
  PublicKey,
  SendTransactionError,
  Transaction,
  type AccountInfo,
} from '@solana/web3.js';
import {
  ACCOUNT_SIZE,
  AccountLayout,
  AccountState,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  MINT_SIZE,
  MintLayout,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import type { ActivationSettlementTransactionRow } from '@/lib/db/activation-settlement-transactions';
import type { SponsoredActivationRow } from '@/lib/db/sponsored-activations';
import type { SolanaSettlementConnection } from '@/lib/activation/solana-cadd-transfer';

const campaignKeypair = Keypair.generate();
const CAMPAIGN = campaignKeypair.publicKey.toBase58();
const VENUE = Keypair.generate().publicKey.toBase58();
const CADD_MINT = Keypair.generate().publicKey.toBase58();
const CADD_DECIMALS = 4;

const mockGetActivation = vi.fn();
const mockGetRedemptionById = vi.fn();
const mockGetSettlementById = vi.fn();
const mockMarkSubmitted = vi.fn();
const mockConfirm = vi.fn();
const mockRecord = vi.fn();
const mockGetWallet = vi.fn();
const mockSignTransaction = vi.fn();
const mockTrackSubmitted = vi.fn();
const mockTrackConfirmed = vi.fn();
const mockTrackFailed = vi.fn();

vi.mock('@/lib/analytics/server', () => ({
  resolveServerIdentity: vi.fn(() => 'mixpanel-test'),
  trackSponsoredSettlementSubmitted: (...a: unknown[]) =>
    mockTrackSubmitted(...a),
  trackSponsoredSettlementConfirmed: (...a: unknown[]) =>
    mockTrackConfirmed(...a),
  trackSponsoredSettlementFailed: (...a: unknown[]) => mockTrackFailed(...a),
}));

vi.mock('@/lib/db/sponsored-activations', () => ({
  getSponsoredActivationById: (...a: unknown[]) => mockGetActivation(...a),
}));

vi.mock('@/lib/db/activation-redemptions', () => ({
  getActivationRedemptionById: (...a: unknown[]) => mockGetRedemptionById(...a),
}));

vi.mock('@/lib/db/activation-settlement-transactions', () => ({
  confirmActivationSettlementAtomic: (...a: unknown[]) => mockConfirm(...a),
  recordActivationSettlementFailureAtomic: (...a: unknown[]) =>
    mockRecord(...a),
  markActivationSettlementSubmitted: (...a: unknown[]) =>
    mockMarkSubmitted(...a),
  getActivationSettlementTransactionById: (...a: unknown[]) =>
    mockGetSettlementById(...a),
}));

vi.mock('@/lib/api/privy', () => ({
  getPrivyClient: () => ({
    walletApi: {
      getWallet: mockGetWallet,
      solana: { signTransaction: mockSignTransaction },
    },
  }),
}));

import {
  processSolanaActivationSettlement,
  runSolanaSettlementWorkerBatch,
  SOLANA_SUBMITTED_SIGNATURE_EXPIRY_MS,
} from './solana-settlement-worker';

const activationFixture: SponsoredActivationRow = {
  id: 'act-1',
  slug: 'test',
  title: 't',
  description: null,
  sponsor_name: 's',
  event_id: null,
  status: 'active',
  settlement_rail: 'solana',
  campaign_wallet_address: CAMPAIGN,
  venue_settlement_wallet_address: VENUE,
  usdc_asset_config: {
    mint: CADD_MINT,
    decimals: CADD_DECIMALS,
    symbol: 'CADD',
  },
  max_redemptions: null,
  max_usdc_budget: null,
  usdc_settled_total: 0,
  redemption_count_confirmed: 0,
  starts_at: '2026-01-01T00:00:00.000Z',
  ends_at: '2027-01-01T00:00:00.000Z',
  eligibility_config: {},
  created_by: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  activation_create_idempotency_key: null,
  privy_campaign_wallet_id: 'privy-sol-wallet-1',
};

function settlementRow(
  overrides: Partial<ActivationSettlementTransactionRow> = {}
): ActivationSettlementTransactionRow {
  return {
    id: 'set-1',
    redemption_id: 'red-1',
    activation_id: 'act-1',
    settlement_rail: 'solana',
    status: 'queued',
    amount: 12.3456,
    from_wallet_address: CAMPAIGN,
    to_wallet_address: VENUE,
    tx_hash: null,
    submission_attempt: 0,
    last_error_code: null,
    queued_at: '2026-01-01T00:00:00.000Z',
    submitted_at: null,
    confirmed_at: null,
    privy_transaction_id: null,
    ...overrides,
  };
}

function mintAccount(): AccountInfo<Buffer> {
  const data = Buffer.alloc(MINT_SIZE);
  MintLayout.encode(
    {
      mintAuthorityOption: 0,
      mintAuthority: PublicKey.default,
      supply: BigInt(10) ** BigInt(12),
      decimals: CADD_DECIMALS,
      isInitialized: true,
      freezeAuthorityOption: 0,
      freezeAuthority: PublicKey.default,
    },
    data
  );
  return {
    data,
    owner: TOKEN_PROGRAM_ID,
    lamports: 1,
    executable: false,
    rentEpoch: 0,
  };
}

function campaignTokenAccount(): AccountInfo<Buffer> {
  const data = Buffer.alloc(ACCOUNT_SIZE);
  AccountLayout.encode(
    {
      mint: new PublicKey(CADD_MINT),
      owner: new PublicKey(CAMPAIGN),
      amount: BigInt(10) ** BigInt(9),
      delegateOption: 0,
      delegate: PublicKey.default,
      state: AccountState.Initialized,
      isNativeOption: 0,
      isNative: BigInt(0),
      delegatedAmount: BigInt(0),
      closeAuthorityOption: 0,
      closeAuthority: PublicKey.default,
    },
    data
  );
  return {
    data,
    owner: TOKEN_PROGRAM_ID,
    lamports: 1,
    executable: false,
    rentEpoch: 0,
  };
}

type SignatureStatus = {
  confirmationStatus: 'processed' | 'confirmed' | 'finalized';
  err: unknown;
} | null;

function fakeConnection(
  statuses: SignatureStatus[] = [{ confirmationStatus: 'finalized', err: null }]
) {
  const campaignAta = getAssociatedTokenAddressSync(
    new PublicKey(CADD_MINT),
    new PublicKey(CAMPAIGN),
    false,
    TOKEN_PROGRAM_ID
  );
  const accounts = new Map<string, AccountInfo<Buffer>>([
    [CADD_MINT, mintAccount()],
    [campaignAta.toBase58(), campaignTokenAccount()],
  ]);
  let statusIndex = 0;
  const connection = {
    getAccountInfo: vi.fn(
      async (key: PublicKey) => accounts.get(key.toBase58()) ?? null
    ),
    getLatestBlockhash: vi.fn(async () => ({
      blockhash: Keypair.generate().publicKey.toBase58(),
      lastValidBlockHeight: 1_000,
    })),
    sendRawTransaction: vi.fn<(bytes: Uint8Array) => Promise<string>>(
      async () => 'ignored'
    ),
    getSignatureStatuses: vi.fn(async () => {
      const status = statuses[Math.min(statusIndex, statuses.length - 1)];
      statusIndex += 1;
      return { context: { slot: 1 }, value: [status] };
    }),
  };
  return connection as typeof connection & SolanaSettlementConnection;
}

const fastOptions = { confirmPollAttempts: 3, confirmPollIntervalMs: 0 };

describe('processSolanaActivationSettlement', () => {
  const envMint = process.env.SPONSORED_ACTIVATION_SOLANA_CADD_MINT;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SPONSORED_ACTIVATION_SOLANA_CADD_MINT =
      Keypair.generate().publicKey.toBase58();
    mockGetActivation.mockResolvedValue(activationFixture);
    mockGetRedemptionById.mockResolvedValue({
      id: 'red-1',
      user_id: 42,
      reward_item_id: 'reward-1',
      status: 'settlement_pending',
    });
    mockGetSettlementById.mockImplementation(async (id: string) =>
      settlementRow({ id, status: 'submitted' })
    );
    mockMarkSubmitted.mockResolvedValue(true);
    mockConfirm.mockResolvedValue('confirmed');
    mockRecord.mockResolvedValue('retry_scheduled');
    mockGetWallet.mockResolvedValue({ address: CAMPAIGN });
    mockSignTransaction.mockImplementation(
      async ({ transaction }: { transaction: Transaction }) => {
        const copy = Transaction.from(
          transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          })
        );
        copy.sign(campaignKeypair);
        return { signedTransaction: copy };
      }
    );
  });

  afterEach(() => {
    process.env.SPONSORED_ACTIVATION_SOLANA_CADD_MINT = envMint;
  });

  it('queued: transfers CADD with the persisted mint/decimals and confirms atomically', async () => {
    const connection = fakeConnection();
    const result = await processSolanaActivationSettlement(settlementRow(), {
      ...fastOptions,
      connection,
    });

    expect(result).toBe('confirmed');
    expect(mockSignTransaction).toHaveBeenCalledTimes(1);
    expect(mockSignTransaction.mock.calls[0][0].walletId).toBe(
      'privy-sol-wallet-1'
    );
    expect(connection.sendRawTransaction).toHaveBeenCalledTimes(1);

    const sent = Transaction.from(
      connection.sendRawTransaction.mock.calls[0][0]
    );
    const signature = mockMarkSubmitted.mock.calls[0][0].txHash as string;
    expect(mockMarkSubmitted).toHaveBeenCalledWith({
      settlementId: 'set-1',
      txHash: signature,
    });
    expect(mockMarkSubmitted.mock.invocationCallOrder[0]).toBeLessThan(
      connection.sendRawTransaction.mock.invocationCallOrder[0]
    );
    expect(mockConfirm).toHaveBeenCalledWith({
      settlementId: 'set-1',
      txHash: signature,
    });
    expect(mockRecord).not.toHaveBeenCalled();
    expect(mockTrackSubmitted).toHaveBeenCalledTimes(1);
    expect(mockTrackConfirmed).toHaveBeenCalledTimes(1);

    expect(sent.feePayer?.toBase58()).toBe(CAMPAIGN);
    expect(sent.verifySignatures()).toBe(true);
    const [createAta, transfer] = sent.instructions;
    const venueAta = getAssociatedTokenAddressSync(
      new PublicKey(CADD_MINT),
      new PublicKey(VENUE),
      true,
      TOKEN_PROGRAM_ID
    );
    expect(createAta.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID)).toBe(true);
    expect([...createAta.data]).toEqual([1]);
    expect(createAta.keys[1].pubkey.equals(venueAta)).toBe(true);
    expect(createAta.keys[3].pubkey.toBase58()).toBe(CADD_MINT);
    expect(transfer.data[0]).toBe(12);
    expect(transfer.data.readBigUInt64LE(1)).toBe(BigInt(123_456));
    expect(transfer.data[9]).toBe(CADD_DECIMALS);
    expect(transfer.keys[1].pubkey.toBase58()).toBe(CADD_MINT);
    expect(transfer.keys[1].pubkey.toBase58()).not.toBe(
      process.env.SPONSORED_ACTIVATION_SOLANA_CADD_MINT
    );
    expect(transfer.keys[2].pubkey.equals(venueAta)).toBe(true);
  });

  it('queued: leaves the row submitted when the signature is not yet finalized', async () => {
    const connection = fakeConnection([
      null,
      { confirmationStatus: 'confirmed', err: null },
    ]);
    const result = await processSolanaActivationSettlement(settlementRow(), {
      ...fastOptions,
      connection,
    });

    expect(result).toBe('skipped');
    expect(mockMarkSubmitted).toHaveBeenCalledTimes(1);
    expect(connection.sendRawTransaction).toHaveBeenCalledTimes(1);
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('submitted + pending: only checks the signature and never sends again', async () => {
    const connection = fakeConnection([
      { confirmationStatus: 'processed', err: null },
    ]);
    const result = await processSolanaActivationSettlement(
      settlementRow({
        status: 'submitted',
        tx_hash: 'sig-on-record',
        submitted_at: new Date().toISOString(),
      }),
      { ...fastOptions, connection }
    );

    expect(result).toBe('skipped');
    expect(connection.getSignatureStatuses).toHaveBeenCalledTimes(1);
    expect(connection.getSignatureStatuses).toHaveBeenCalledWith(
      ['sig-on-record'],
      { searchTransactionHistory: true }
    );
    expect(mockSignTransaction).not.toHaveBeenCalled();
    expect(connection.sendRawTransaction).not.toHaveBeenCalled();
    expect(mockMarkSubmitted).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('submitted + finalized: completes through confirmActivationSettlementAtomic', async () => {
    const connection = fakeConnection();
    const result = await processSolanaActivationSettlement(
      settlementRow({
        status: 'submitted',
        tx_hash: 'sig-on-record',
        submitted_at: new Date().toISOString(),
      }),
      { ...fastOptions, connection }
    );

    expect(result).toBe('confirmed');
    expect(mockConfirm).toHaveBeenCalledWith({
      settlementId: 'set-1',
      txHash: 'sig-on-record',
    });
    expect(connection.sendRawTransaction).not.toHaveBeenCalled();
    expect(mockSignTransaction).not.toHaveBeenCalled();
  });

  it('submitted + finalized with an error: records an on-chain failure', async () => {
    const connection = fakeConnection([
      { confirmationStatus: 'finalized', err: { InstructionError: [1, 'x'] } },
    ]);
    const result = await processSolanaActivationSettlement(
      settlementRow({ status: 'submitted', tx_hash: 'sig-on-record' }),
      { ...fastOptions, connection }
    );

    expect(result).toBe('retry_scheduled');
    expect(mockRecord).toHaveBeenCalledWith({
      settlementId: 'set-1',
      lastErrorCode: 'solana_tx_failed_onchain',
    });
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('submitted + unseen signature: waits until the blockhash window has passed before failing', async () => {
    const submittedAt = '2026-01-01T00:00:00.000Z';
    const row = settlementRow({
      status: 'submitted',
      tx_hash: 'sig-on-record',
      submitted_at: submittedAt,
    });
    const recent = await processSolanaActivationSettlement(row, {
      ...fastOptions,
      connection: fakeConnection([null]),
      now: () => Date.parse(submittedAt) + 60_000,
    });
    expect(recent).toBe('skipped');
    expect(mockRecord).not.toHaveBeenCalled();

    const expired = await processSolanaActivationSettlement(row, {
      ...fastOptions,
      connection: fakeConnection([null]),
      now: () => Date.parse(submittedAt) + SOLANA_SUBMITTED_SIGNATURE_EXPIRY_MS,
    });
    expect(expired).toBe('retry_scheduled');
    expect(mockRecord).toHaveBeenCalledWith({
      settlementId: 'set-1',
      lastErrorCode: 'solana_tx_expired',
    });
  });

  it('submitted + RPC error: stays submitted', async () => {
    const connection = fakeConnection();
    connection.getSignatureStatuses.mockRejectedValue(new Error('rpc down'));
    const result = await processSolanaActivationSettlement(
      settlementRow({
        status: 'submitted',
        tx_hash: 'sig-on-record',
        submitted_at: '2020-01-01T00:00:00.000Z',
      }),
      { ...fastOptions, connection }
    );
    expect(result).toBe('skipped');
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('failed Privy submission uses the existing retry path without persisting or sending', async () => {
    mockSignTransaction.mockRejectedValue(new Error('privy 500'));
    const connection = fakeConnection();
    const result = await processSolanaActivationSettlement(settlementRow(), {
      ...fastOptions,
      connection,
    });

    expect(result).toBe('retry_scheduled');
    expect(mockRecord).toHaveBeenCalledWith({
      settlementId: 'set-1',
      lastErrorCode: 'privy_sign_failed',
    });
    expect(mockMarkSubmitted).not.toHaveBeenCalled();
    expect(connection.sendRawTransaction).not.toHaveBeenCalled();
  });

  it('exhausted failure emits the failed analytics event', async () => {
    mockSignTransaction.mockRejectedValue(new Error('privy 500'));
    mockRecord.mockResolvedValue('exhausted');
    const result = await processSolanaActivationSettlement(settlementRow(), {
      ...fastOptions,
      connection: fakeConnection(),
    });
    expect(result).toBe('failed');
    expect(mockTrackFailed).toHaveBeenCalledTimes(1);
  });

  it('RPC-rejected broadcast records a failure (nothing was forwarded)', async () => {
    const connection = fakeConnection();
    connection.sendRawTransaction.mockRejectedValue(
      new SendTransactionError({
        action: 'send',
        signature: '',
        transactionMessage: 'Blockhash not found',
      })
    );
    const result = await processSolanaActivationSettlement(settlementRow(), {
      ...fastOptions,
      connection,
    });

    expect(result).toBe('retry_scheduled');
    expect(mockMarkSubmitted).toHaveBeenCalledTimes(1);
    expect(mockRecord).toHaveBeenCalledWith({
      settlementId: 'set-1',
      lastErrorCode: 'solana_broadcast_rejected',
    });
  });

  it('ambiguous broadcast failure keeps tracking the persisted signature', async () => {
    const connection = fakeConnection();
    connection.sendRawTransaction.mockRejectedValue(
      new TypeError('fetch failed')
    );
    const result = await processSolanaActivationSettlement(settlementRow(), {
      ...fastOptions,
      connection,
    });

    expect(result).toBe('confirmed');
    expect(mockRecord).not.toHaveBeenCalled();
    expect(mockConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not broadcast when another worker already moved the row out of queued', async () => {
    mockMarkSubmitted.mockResolvedValue(false);
    const connection = fakeConnection();
    const result = await processSolanaActivationSettlement(settlementRow(), {
      ...fastOptions,
      connection,
    });

    expect(result).toBe('skipped');
    expect(connection.sendRawTransaction).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it.each([
    [{ from_wallet_address: VENUE }, 'campaign_from_mismatch'],
    [
      { to_wallet_address: Keypair.generate().publicKey.toBase58() },
      'venue_to_mismatch',
    ],
    [{ to_wallet_address: 'not-a-solana-address' }, 'solana_address_invalid'],
  ] as const)(
    'rejects wallet mismatches (%j → %s)',
    async (overrides, code) => {
      const connection = fakeConnection();
      const result = await processSolanaActivationSettlement(
        settlementRow(overrides),
        { ...fastOptions, connection }
      );
      expect(result).toBe('retry_scheduled');
      expect(mockRecord).toHaveBeenCalledWith({
        settlementId: 'set-1',
        lastErrorCode: code,
      });
      expect(mockSignTransaction).not.toHaveBeenCalled();
      expect(connection.sendRawTransaction).not.toHaveBeenCalled();
    }
  );

  it('rejects an activation on another rail', async () => {
    mockGetActivation.mockResolvedValue({
      ...activationFixture,
      settlement_rail: 'stellar',
    });
    const result = await processSolanaActivationSettlement(settlementRow(), {
      ...fastOptions,
      connection: fakeConnection(),
    });
    expect(result).toBe('retry_scheduled');
    expect(mockRecord).toHaveBeenCalledWith({
      settlementId: 'set-1',
      lastErrorCode: 'wrong_rail',
    });
  });

  it('rejects an invalid persisted CADD asset config', async () => {
    mockGetActivation.mockResolvedValue({
      ...activationFixture,
      usdc_asset_config: { mint: CADD_MINT, decimals: 6, symbol: 'USDC' },
    });
    const result = await processSolanaActivationSettlement(settlementRow(), {
      ...fastOptions,
      connection: fakeConnection(),
    });
    expect(mockRecord).toHaveBeenCalledWith({
      settlementId: 'set-1',
      lastErrorCode: 'invalid_cadd_asset_config',
    });
    expect(result).toBe('retry_scheduled');
  });

  it('handles a missing Privy campaign wallet cleanly', async () => {
    mockGetActivation.mockResolvedValue({
      ...activationFixture,
      privy_campaign_wallet_id: null,
    });
    const connection = fakeConnection();
    const result = await processSolanaActivationSettlement(settlementRow(), {
      ...fastOptions,
      connection,
    });
    expect(result).toBe('retry_scheduled');
    expect(mockRecord).toHaveBeenCalledWith({
      settlementId: 'set-1',
      lastErrorCode: 'campaign_wallet_not_configured',
    });
    expect(mockGetWallet).not.toHaveBeenCalled();
    expect(connection.sendRawTransaction).not.toHaveBeenCalled();
  });

  it('rejects a redemption that is not awaiting settlement', async () => {
    mockGetRedemptionById.mockResolvedValue({
      id: 'red-1',
      user_id: 42,
      reward_item_id: 'reward-1',
      status: 'settlement_failed',
    });
    const result = await processSolanaActivationSettlement(settlementRow(), {
      ...fastOptions,
      connection: fakeConnection(),
    });
    expect(result).toBe('retry_scheduled');
    expect(mockRecord).toHaveBeenCalledWith({
      settlementId: 'set-1',
      lastErrorCode: 'redemption_status_invalid',
    });
    expect(mockSignTransaction).not.toHaveBeenCalled();
  });

  it('fails a submitted row with no signature on record', async () => {
    const result = await processSolanaActivationSettlement(
      settlementRow({ status: 'submitted', tx_hash: null }),
      { ...fastOptions, connection: fakeConnection() }
    );
    expect(result).toBe('retry_scheduled');
    expect(mockRecord).toHaveBeenCalledWith({
      settlementId: 'set-1',
      lastErrorCode: 'submitted_missing_tx_hash',
    });
  });
});

describe('runSolanaSettlementWorkerBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActivation.mockResolvedValue(activationFixture);
    mockConfirm.mockResolvedValue('confirmed');
    mockRecord.mockResolvedValue('retry_scheduled');
  });

  it('summarizes Solana rows and skips other rails', async () => {
    const connection = fakeConnection();
    const summary = await runSolanaSettlementWorkerBatch(
      [
        settlementRow({ id: 'a', status: 'submitted', tx_hash: 'sig-a' }),
        settlementRow({ id: 'b', settlement_rail: 'stellar' }),
        settlementRow({ id: 'c', status: 'submitted', tx_hash: null }),
      ],
      { ...fastOptions, connection }
    );
    expect(summary).toEqual({
      processed: 2,
      confirmed: 1,
      failed: 0,
      skipped: 1,
      scheduledRetry: 1,
    });
  });

  it('does not record a failure for a worker exception once a signature is on record', async () => {
    mockConfirm.mockRejectedValue(new Error('db down'));
    mockGetSettlementById.mockResolvedValue(
      settlementRow({ status: 'submitted', tx_hash: 'sig-a' })
    );
    const summary = await runSolanaSettlementWorkerBatch(
      [settlementRow({ status: 'submitted', tx_hash: 'sig-a' })],
      { ...fastOptions, connection: fakeConnection() }
    );
    expect(summary.skipped).toBe(1);
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('records worker_exception when no signature is on record', async () => {
    mockGetActivation.mockRejectedValue(new Error('db down'));
    mockGetSettlementById.mockResolvedValue(settlementRow());
    const summary = await runSolanaSettlementWorkerBatch([settlementRow()], {
      ...fastOptions,
      connection: fakeConnection(),
    });
    expect(summary.scheduledRetry).toBe(1);
    expect(mockRecord).toHaveBeenCalledWith({
      settlementId: 'set-1',
      lastErrorCode: 'worker_exception',
    });
  });
});

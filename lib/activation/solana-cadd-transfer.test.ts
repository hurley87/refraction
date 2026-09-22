import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  ASSOCIATED_TOKEN_PROGRAM_ID,
  AccountState,
  getAssociatedTokenAddressSync,
  MINT_SIZE,
  MintLayout,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { getBase58Decoder } from '@solana/kit';

const mockGetPrivyClient = vi.fn();
vi.mock('@/lib/api/privy', () => ({
  getPrivyClient: () => mockGetPrivyClient(),
}));

import {
  broadcastSolanaTransaction,
  buildSolanaCaddTransferTransaction,
  caddAmountToBaseUnits,
  getSolanaSignatureOutcome,
  signSolanaCaddTransferWithPrivy,
  type SolanaSettlementConnection,
} from './solana-cadd-transfer';

const campaignKeypair = Keypair.generate();
const CAMPAIGN = campaignKeypair.publicKey;
const VENUE = Keypair.generate().publicKey;
const MINT = Keypair.generate().publicKey;
const BLOCKHASH = Keypair.generate().publicKey.toBase58();

function mintAccount(decimals: number, owner: PublicKey): AccountInfo<Buffer> {
  const data = Buffer.alloc(MINT_SIZE);
  MintLayout.encode(
    {
      mintAuthorityOption: 0,
      mintAuthority: PublicKey.default,
      supply: BigInt(1_000_000_000_000),
      decimals,
      isInitialized: true,
      freezeAuthorityOption: 0,
      freezeAuthority: PublicKey.default,
    },
    data
  );
  return { data, owner, lamports: 1, executable: false, rentEpoch: 0 };
}

function tokenAccount(
  owner: PublicKey,
  amount: bigint,
  programId: PublicKey
): AccountInfo<Buffer> {
  const data = Buffer.alloc(ACCOUNT_SIZE);
  AccountLayout.encode(
    {
      mint: MINT,
      owner,
      amount,
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
    owner: programId,
    lamports: 1,
    executable: false,
    rentEpoch: 0,
  };
}

function fakeConnection(input: {
  decimals: number;
  programId?: PublicKey;
  campaignBalance?: bigint | null;
}): SolanaSettlementConnection {
  const programId = input.programId ?? TOKEN_PROGRAM_ID;
  const campaignAta = getAssociatedTokenAddressSync(
    MINT,
    CAMPAIGN,
    false,
    programId
  );
  const accounts = new Map<string, AccountInfo<Buffer>>([
    [MINT.toBase58(), mintAccount(input.decimals, programId)],
  ]);
  if (input.campaignBalance !== null) {
    accounts.set(
      campaignAta.toBase58(),
      tokenAccount(
        CAMPAIGN,
        input.campaignBalance ?? BigInt(10) ** BigInt(30),
        programId
      )
    );
  }
  return {
    getAccountInfo: vi.fn(
      async (key: PublicKey) => accounts.get(key.toBase58()) ?? null
    ),
    getLatestBlockhash: vi.fn(async () => ({
      blockhash: BLOCKHASH,
      lastValidBlockHeight: 1_000,
    })),
    sendRawTransaction: vi.fn(),
    getSignatureStatuses: vi.fn(),
  } as unknown as SolanaSettlementConnection;
}

const caddConfig = (decimals: number) => ({
  mint: MINT.toBase58(),
  decimals,
  symbol: 'CADD' as const,
});

describe('caddAmountToBaseUnits', () => {
  it('converts exactly for non-6-decimal precision', () => {
    expect(caddAmountToBaseUnits(1.5, 9)).toBe(BigInt(1_500_000_000));
    expect(caddAmountToBaseUnits(0.1, 2)).toBe(BigInt(10));
    expect(caddAmountToBaseUnits(12, 0)).toBe(BigInt(12));
    expect(caddAmountToBaseUnits(1e-7, 8)).toBe(BigInt(10));
    expect(caddAmountToBaseUnits('25.000', 3)).toBe(BigInt(25_000));
  });

  it('avoids floating-point multiplication drift', () => {
    expect(1.15 * 10 ** 2).not.toBe(115);
    expect(caddAmountToBaseUnits(1.15, 2)).toBe(BigInt(115));
    expect(8.2 * 10 ** 9).not.toBe(8_200_000_000);
    expect(caddAmountToBaseUnits(8.2, 9)).toBe(BigInt(8_200_000_000));
    expect(caddAmountToBaseUnits(0.3, 18)).toBe(BigInt('300000000000000000'));
  });

  it('rejects amounts beyond the token precision instead of rounding', () => {
    expect(() => caddAmountToBaseUnits(1.005, 2)).toThrow(/precision/);
    expect(() => caddAmountToBaseUnits(0.5, 0)).toThrow(/precision/);
  });

  it('rejects invalid amounts and decimals', () => {
    expect(() => caddAmountToBaseUnits(-1, 6)).toThrow();
    expect(() => caddAmountToBaseUnits(Number.NaN, 6)).toThrow();
    expect(() => caddAmountToBaseUnits(1, 19)).toThrow();
  });
});

describe('buildSolanaCaddTransferTransaction', () => {
  it('builds an idempotent venue ATA create + transferChecked with the persisted mint and decimals', async () => {
    const connection = fakeConnection({ decimals: 9 });
    const built = await buildSolanaCaddTransferTransaction({
      connection,
      campaignAddress: CAMPAIGN.toBase58(),
      venueAddress: VENUE.toBase58(),
      assetConfig: caddConfig(9),
      amount: 2.5,
    });
    if (!built.ok) throw new Error(built.reason);

    const { transaction } = built;
    expect(transaction.feePayer?.equals(CAMPAIGN)).toBe(true);
    expect(transaction.recentBlockhash).toBe(BLOCKHASH);
    expect(transaction.instructions).toHaveLength(2);

    const venueAta = getAssociatedTokenAddressSync(
      MINT,
      VENUE,
      true,
      TOKEN_PROGRAM_ID
    );
    const [createAta, transfer] = transaction.instructions;
    expect(createAta.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID)).toBe(true);
    expect([...createAta.data]).toEqual([1]);
    expect(createAta.keys[0].pubkey.equals(CAMPAIGN)).toBe(true);
    expect(createAta.keys[0].isSigner).toBe(true);
    expect(createAta.keys[1].pubkey.equals(venueAta)).toBe(true);
    expect(createAta.keys[2].pubkey.equals(VENUE)).toBe(true);
    expect(createAta.keys[3].pubkey.equals(MINT)).toBe(true);
    expect(createAta.keys[5].pubkey.equals(TOKEN_PROGRAM_ID)).toBe(true);

    expect(transfer.programId.equals(TOKEN_PROGRAM_ID)).toBe(true);
    expect(transfer.data[0]).toBe(12);
    expect(transfer.data.readBigUInt64LE(1)).toBe(BigInt(2_500_000_000));
    expect(transfer.data[9]).toBe(9);
    expect(transfer.keys[0].pubkey.equals(built.sourceTokenAccount)).toBe(true);
    expect(transfer.keys[1].pubkey.equals(MINT)).toBe(true);
    expect(transfer.keys[2].pubkey.equals(venueAta)).toBe(true);
    expect(transfer.keys[3].pubkey.equals(CAMPAIGN)).toBe(true);
    expect(built.amountBaseUnits).toBe(BigInt(2_500_000_000));
  });

  it('uses the token program that owns the mint (Token-2022)', async () => {
    const built = await buildSolanaCaddTransferTransaction({
      connection: fakeConnection({
        decimals: 2,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      campaignAddress: CAMPAIGN.toBase58(),
      venueAddress: VENUE.toBase58(),
      assetConfig: caddConfig(2),
      amount: 10.25,
    });
    if (!built.ok) throw new Error(built.reason);
    expect(built.tokenProgramId.equals(TOKEN_2022_PROGRAM_ID)).toBe(true);
    expect(
      built.venueTokenAccount.equals(
        getAssociatedTokenAddressSync(MINT, VENUE, true, TOKEN_2022_PROGRAM_ID)
      )
    ).toBe(true);
    const [createAta, transfer] = built.transaction.instructions;
    expect(createAta.keys[5].pubkey.equals(TOKEN_2022_PROGRAM_ID)).toBe(true);
    expect(transfer.programId.equals(TOKEN_2022_PROGRAM_ID)).toBe(true);
    expect(transfer.data.readBigUInt64LE(1)).toBe(BigInt(1_025));
    expect(transfer.data[9]).toBe(2);
  });

  it('rejects when the on-chain mint decimals differ from the persisted config', async () => {
    const built = await buildSolanaCaddTransferTransaction({
      connection: fakeConnection({ decimals: 6 }),
      campaignAddress: CAMPAIGN.toBase58(),
      venueAddress: VENUE.toBase58(),
      assetConfig: caddConfig(9),
      amount: 1,
    });
    expect(built).toEqual({
      ok: false,
      reason: 'solana_cadd_decimals_mismatch',
    });
  });

  it('rejects a mint not owned by an SPL token program', async () => {
    const built = await buildSolanaCaddTransferTransaction({
      connection: fakeConnection({
        decimals: 9,
        programId: Keypair.generate().publicKey,
      }),
      campaignAddress: CAMPAIGN.toBase58(),
      venueAddress: VENUE.toBase58(),
      assetConfig: caddConfig(9),
      amount: 1,
    });
    expect(built).toEqual({ ok: false, reason: 'solana_cadd_mint_invalid' });
  });

  it('reports insufficient CADD for a short or missing campaign token account', async () => {
    const params = {
      campaignAddress: CAMPAIGN.toBase58(),
      venueAddress: VENUE.toBase58(),
      assetConfig: caddConfig(2),
      amount: 5,
    };
    await expect(
      buildSolanaCaddTransferTransaction({
        ...params,
        connection: fakeConnection({
          decimals: 2,
          campaignBalance: BigInt(499),
        }),
      })
    ).resolves.toEqual({ ok: false, reason: 'insufficient_campaign_cadd' });
    await expect(
      buildSolanaCaddTransferTransaction({
        ...params,
        connection: fakeConnection({ decimals: 2, campaignBalance: null }),
      })
    ).resolves.toEqual({ ok: false, reason: 'insufficient_campaign_cadd' });
  });

  it('rejects amounts the CADD precision cannot represent', async () => {
    const built = await buildSolanaCaddTransferTransaction({
      connection: fakeConnection({ decimals: 2 }),
      campaignAddress: CAMPAIGN.toBase58(),
      venueAddress: VENUE.toBase58(),
      assetConfig: caddConfig(2),
      amount: 1.005,
    });
    expect(built).toEqual({ ok: false, reason: 'solana_amount_invalid' });
  });
});

describe('signSolanaCaddTransferWithPrivy', () => {
  const mockGetWallet = vi.fn();
  const mockSignTransaction = vi.fn();

  async function buildTx(): Promise<Transaction> {
    const built = await buildSolanaCaddTransferTransaction({
      connection: fakeConnection({ decimals: 9 }),
      campaignAddress: CAMPAIGN.toBase58(),
      venueAddress: VENUE.toBase58(),
      assetConfig: caddConfig(9),
      amount: 1,
    });
    if (!built.ok) throw new Error(built.reason);
    return built.transaction;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPrivyClient.mockReturnValue({
      walletApi: {
        getWallet: mockGetWallet,
        solana: { signTransaction: mockSignTransaction },
      },
    });
    mockGetWallet.mockResolvedValue({ address: CAMPAIGN.toBase58() });
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

  it('signs with the Privy campaign wallet and returns the fee-payer signature', async () => {
    const transaction = await buildTx();
    const signed = await signSolanaCaddTransferWithPrivy({
      privyWalletId: 'privy-wallet-1',
      campaignAddress: CAMPAIGN.toBase58(),
      transaction,
    });
    if (!signed.ok) throw new Error(signed.reason);

    expect(mockGetWallet).toHaveBeenCalledWith({ id: 'privy-wallet-1' });
    expect(mockSignTransaction).toHaveBeenCalledWith({
      walletId: 'privy-wallet-1',
      transaction,
    });
    const onWire = Transaction.from(signed.serializedTransaction);
    expect(onWire.feePayer?.equals(CAMPAIGN)).toBe(true);
    expect(signed.signature).toBe(getBase58Decoder().decode(onWire.signature!));
  });

  it('rejects when the Privy wallet address is not the campaign wallet', async () => {
    mockGetWallet.mockResolvedValue({ address: VENUE.toBase58() });
    const signed = await signSolanaCaddTransferWithPrivy({
      privyWalletId: 'privy-wallet-1',
      campaignAddress: CAMPAIGN.toBase58(),
      transaction: await buildTx(),
    });
    expect(signed).toEqual({ ok: false, reason: 'campaign_wallet_mismatch' });
    expect(mockSignTransaction).not.toHaveBeenCalled();
  });

  it('rejects a signed transaction whose message differs from the one built', async () => {
    mockSignTransaction.mockImplementation(async () => {
      const other = await buildTx();
      other.recentBlockhash = Keypair.generate().publicKey.toBase58();
      other.sign(campaignKeypair);
      return { signedTransaction: other };
    });
    const signed = await signSolanaCaddTransferWithPrivy({
      privyWalletId: 'privy-wallet-1',
      campaignAddress: CAMPAIGN.toBase58(),
      transaction: await buildTx(),
    });
    expect(signed).toEqual({ ok: false, reason: 'privy_sign_invalid' });
  });

  it('maps Privy configuration and API errors to failure codes', async () => {
    const transaction = await buildTx();
    mockGetPrivyClient.mockImplementationOnce(() => {
      throw new Error(
        'Missing PRIVY_APP_ID or PRIVY_APP_SECRET environment variables'
      );
    });
    await expect(
      signSolanaCaddTransferWithPrivy({
        privyWalletId: 'w',
        campaignAddress: CAMPAIGN.toBase58(),
        transaction,
      })
    ).resolves.toEqual({ ok: false, reason: 'privy_not_configured' });

    mockSignTransaction.mockRejectedValueOnce(new Error('privy 500'));
    await expect(
      signSolanaCaddTransferWithPrivy({
        privyWalletId: 'w',
        campaignAddress: CAMPAIGN.toBase58(),
        transaction,
      })
    ).resolves.toEqual({ ok: false, reason: 'privy_sign_failed' });
  });
});

describe('broadcastSolanaTransaction', () => {
  it('distinguishes RPC rejection from an ambiguous transport failure', async () => {
    const connection = fakeConnection({ decimals: 9 });
    const send = vi.mocked(connection.sendRawTransaction);

    send.mockResolvedValueOnce('sig');
    await expect(
      broadcastSolanaTransaction({
        connection,
        serializedTransaction: new Uint8Array(),
      })
    ).resolves.toEqual({ status: 'sent' });

    send.mockRejectedValueOnce(
      new SendTransactionError({
        action: 'send',
        signature: '',
        transactionMessage: 'Blockhash not found',
      })
    );
    await expect(
      broadcastSolanaTransaction({
        connection,
        serializedTransaction: new Uint8Array(),
      })
    ).resolves.toMatchObject({ status: 'rejected' });

    send.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(
      broadcastSolanaTransaction({
        connection,
        serializedTransaction: new Uint8Array(),
      })
    ).resolves.toMatchObject({ status: 'unknown' });
  });
});

describe('getSolanaSignatureOutcome', () => {
  it.each([
    [null, 'not_found'],
    [{ confirmationStatus: 'processed', err: null }, 'pending'],
    [{ confirmationStatus: 'confirmed', err: null }, 'pending'],
    [{ confirmationStatus: 'finalized', err: null }, 'success'],
    [
      {
        confirmationStatus: 'finalized',
        err: { InstructionError: [1, 'Custom'] },
      },
      'failed',
    ],
  ])('maps status %j to %s', async (status, expected) => {
    const connection = fakeConnection({ decimals: 9 });
    vi.mocked(connection.getSignatureStatuses).mockResolvedValue({
      context: { slot: 1 },
      value: [status as never],
    });
    await expect(
      getSolanaSignatureOutcome({ connection, signature: 'sig' })
    ).resolves.toBe(expected);
    expect(connection.getSignatureStatuses).toHaveBeenCalledWith(['sig'], {
      searchTransactionHistory: true,
    });
  });
});

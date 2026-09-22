import {
  Connection,
  PublicKey,
  SendTransactionError,
  Transaction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  unpackAccount,
  unpackMint,
} from '@solana/spl-token';
import { getBase58Decoder } from '@solana/kit';
import { getPrivyClient } from '@/lib/api/privy';
import {
  getSolanaRpcUrl,
  isValidSolanaTokenDecimals,
  type SolanaCaddAssetConfig,
} from '@/lib/activation/solana-config';

export const SOLANA_CADD_TRANSFER_ERROR_CODES = {
  solana_address_invalid: 'solana_address_invalid',
  solana_amount_invalid: 'solana_amount_invalid',
  solana_cadd_mint_not_found: 'solana_cadd_mint_not_found',
  solana_cadd_mint_invalid: 'solana_cadd_mint_invalid',
  solana_cadd_decimals_mismatch: 'solana_cadd_decimals_mismatch',
  insufficient_campaign_cadd: 'insufficient_campaign_cadd',
  privy_not_configured: 'privy_not_configured',
  campaign_wallet_mismatch: 'campaign_wallet_mismatch',
  privy_sign_failed: 'privy_sign_failed',
  privy_sign_invalid: 'privy_sign_invalid',
} as const;

export type SolanaCaddTransferErrorCode =
  (typeof SOLANA_CADD_TRANSFER_ERROR_CODES)[keyof typeof SOLANA_CADD_TRANSFER_ERROR_CODES];

export type SolanaSettlementConnection = Pick<
  Connection,
  | 'getAccountInfo'
  | 'getLatestBlockhash'
  | 'sendRawTransaction'
  | 'getSignatureStatuses'
  | 'getBlockHeight'
>;

export function createSolanaSettlementConnection(): SolanaSettlementConnection {
  return new Connection(getSolanaRpcUrl(), 'confirmed');
}

const DECIMAL_AMOUNT_RE = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i;

/**
 * Converts a decimal token amount to integer base units without floating-point
 * multiplication. Numbers are read via their shortest round-trip decimal form
 * (e.g. `0.1` → "0.1"). Throws when the amount is negative, non-finite, or has
 * more fractional digits than `decimals` (no silent rounding).
 */
export function caddAmountToBaseUnits(
  amount: number | string,
  decimals: number
): bigint {
  if (!isValidSolanaTokenDecimals(decimals)) {
    throw new Error(`Invalid token decimals: ${decimals}`);
  }
  const text =
    typeof amount === 'number'
      ? Number.isFinite(amount)
        ? String(amount)
        : ''
      : amount.trim();
  const match = DECIMAL_AMOUNT_RE.exec(text);
  if (!match) throw new Error(`Invalid token amount: ${String(amount)}`);

  const [, intPart, fracPart = '', exponentPart = '0'] = match;
  const digits = `${intPart}${fracPart}`;
  const shift = decimals + Number(exponentPart) - fracPart.length;
  if (shift >= 0) {
    return BigInt(digits) * BigInt(10) ** BigInt(shift);
  }
  const keep = digits.length + shift;
  if (/[^0]/.test(digits.slice(Math.max(0, keep)))) {
    throw new Error(
      `Token amount ${String(amount)} exceeds ${decimals}-decimal precision`
    );
  }
  return keep > 0 ? BigInt(digits.slice(0, keep)) : BigInt(0);
}

function tryPublicKey(value: string): PublicKey | null {
  try {
    return new PublicKey(value.trim());
  } catch {
    return null;
  }
}

function tokenProgramForOwner(owner: PublicKey): PublicKey | null {
  if (owner.equals(TOKEN_PROGRAM_ID)) return TOKEN_PROGRAM_ID;
  if (owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  return null;
}

export type BuildSolanaCaddTransferResult =
  | {
      ok: true;
      transaction: Transaction;
      /** Last block height at which the transaction's blockhash is still valid. */
      lastValidBlockHeight: number;
      amountBaseUnits: bigint;
      tokenProgramId: PublicKey;
      sourceTokenAccount: PublicKey;
      venueTokenAccount: PublicKey;
    }
  | { ok: false; reason: SolanaCaddTransferErrorCode };

/**
 * Builds one legacy transaction, fee-paid by the campaign wallet, that
 * idempotently creates the venue's CADD associated token account and then
 * `transferChecked`s the exact amount from the campaign's CADD ATA. The mint's
 * owning token program (SPL Token or Token-2022) is read on-chain, and its
 * decimals must equal the persisted `decimals`.
 */
export async function buildSolanaCaddTransferTransaction(params: {
  connection: SolanaSettlementConnection;
  campaignAddress: string;
  venueAddress: string;
  assetConfig: SolanaCaddAssetConfig;
  amount: number;
}): Promise<BuildSolanaCaddTransferResult> {
  const codes = SOLANA_CADD_TRANSFER_ERROR_CODES;
  const campaign = tryPublicKey(params.campaignAddress);
  const venue = tryPublicKey(params.venueAddress);
  const mint = tryPublicKey(params.assetConfig.mint);
  if (!campaign || !venue || !mint) {
    return { ok: false, reason: codes.solana_address_invalid };
  }

  let amountBaseUnits: bigint;
  try {
    amountBaseUnits = caddAmountToBaseUnits(
      params.amount,
      params.assetConfig.decimals
    );
  } catch {
    return { ok: false, reason: codes.solana_amount_invalid };
  }
  if (amountBaseUnits <= BigInt(0)) {
    return { ok: false, reason: codes.solana_amount_invalid };
  }

  const mintInfo = await params.connection.getAccountInfo(mint, 'confirmed');
  if (!mintInfo) return { ok: false, reason: codes.solana_cadd_mint_not_found };
  const tokenProgramId = tokenProgramForOwner(mintInfo.owner);
  if (!tokenProgramId) {
    return { ok: false, reason: codes.solana_cadd_mint_invalid };
  }
  let mintDecimals: number;
  try {
    mintDecimals = unpackMint(mint, mintInfo, tokenProgramId).decimals;
  } catch {
    return { ok: false, reason: codes.solana_cadd_mint_invalid };
  }
  if (mintDecimals !== params.assetConfig.decimals) {
    return { ok: false, reason: codes.solana_cadd_decimals_mismatch };
  }

  const sourceTokenAccount = getAssociatedTokenAddressSync(
    mint,
    campaign,
    false,
    tokenProgramId
  );
  const sourceInfo = await params.connection.getAccountInfo(
    sourceTokenAccount,
    'confirmed'
  );
  if (!sourceInfo) {
    return { ok: false, reason: codes.insufficient_campaign_cadd };
  }
  try {
    const source = unpackAccount(
      sourceTokenAccount,
      sourceInfo,
      tokenProgramId
    );
    if (source.amount < amountBaseUnits) {
      return { ok: false, reason: codes.insufficient_campaign_cadd };
    }
  } catch {
    return { ok: false, reason: codes.insufficient_campaign_cadd };
  }

  const venueTokenAccount = getAssociatedTokenAddressSync(
    mint,
    venue,
    true,
    tokenProgramId
  );
  const { blockhash, lastValidBlockHeight } =
    await params.connection.getLatestBlockhash('confirmed');

  const transaction = new Transaction({
    feePayer: campaign,
    blockhash,
    lastValidBlockHeight,
  }).add(
    createAssociatedTokenAccountIdempotentInstruction(
      campaign,
      venueTokenAccount,
      venue,
      mint,
      tokenProgramId
    ),
    createTransferCheckedInstruction(
      sourceTokenAccount,
      mint,
      venueTokenAccount,
      campaign,
      amountBaseUnits,
      params.assetConfig.decimals,
      [],
      tokenProgramId
    )
  );

  return {
    ok: true,
    transaction,
    lastValidBlockHeight,
    amountBaseUnits,
    tokenProgramId,
    sourceTokenAccount,
    venueTokenAccount,
  };
}

export type SignSolanaCaddTransferResult =
  | { ok: true; signature: string; serializedTransaction: Uint8Array }
  | { ok: false; reason: SolanaCaddTransferErrorCode };

/**
 * Signs (without broadcasting) with the activation's Privy Solana server wallet.
 * The fee-payer signature is the transaction id, so callers can persist it
 * before anything reaches the network.
 */
export async function signSolanaCaddTransferWithPrivy(params: {
  privyWalletId: string;
  campaignAddress: string;
  transaction: Transaction;
}): Promise<SignSolanaCaddTransferResult> {
  const codes = SOLANA_CADD_TRANSFER_ERROR_CODES;
  let privy: ReturnType<typeof getPrivyClient>;
  try {
    privy = getPrivyClient();
  } catch {
    return { ok: false, reason: codes.privy_not_configured };
  }

  try {
    const wallet = await privy.walletApi.getWallet({
      id: params.privyWalletId,
    });
    if (wallet.address?.trim() !== params.campaignAddress.trim()) {
      return { ok: false, reason: codes.campaign_wallet_mismatch };
    }

    const { signedTransaction } = await privy.walletApi.solana.signTransaction({
      walletId: params.privyWalletId,
      transaction: params.transaction,
    });
    if ('version' in signedTransaction) {
      return { ok: false, reason: codes.privy_sign_invalid };
    }
    const signatureBytes = signedTransaction.signature;
    const sameMessage = signedTransaction
      .serializeMessage()
      .equals(params.transaction.serializeMessage());
    if (
      !signatureBytes ||
      !sameMessage ||
      !signedTransaction.verifySignatures()
    ) {
      return { ok: false, reason: codes.privy_sign_invalid };
    }
    return {
      ok: true,
      signature: getBase58Decoder().decode(signatureBytes),
      serializedTransaction: signedTransaction.serialize(),
    };
  } catch (error) {
    console.error('signSolanaCaddTransferWithPrivy:', error);
    return { ok: false, reason: codes.privy_sign_failed };
  }
}

/**
 * `rejected` means the RPC refused the transaction (e.g. preflight failure), so
 * it was not forwarded. `unknown` means the outcome is ambiguous (transport
 * error) and the signature must be tracked rather than re-sent.
 */
export async function broadcastSolanaTransaction(params: {
  connection: SolanaSettlementConnection;
  serializedTransaction: Uint8Array;
}): Promise<{ status: 'sent' | 'rejected' | 'unknown'; message?: string }> {
  try {
    await params.connection.sendRawTransaction(params.serializedTransaction, {
      preflightCommitment: 'confirmed',
      maxRetries: 5,
    });
    return { status: 'sent' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: error instanceof SendTransactionError ? 'rejected' : 'unknown',
      message,
    };
  }
}

export type SolanaSignatureOutcome =
  | 'success'
  | 'failed'
  | 'pending'
  | 'not_found';

/** Success/failure only once finalized; anything earlier is `pending`. */
export async function getSolanaSignatureOutcome(params: {
  connection: SolanaSettlementConnection;
  signature: string;
}): Promise<SolanaSignatureOutcome> {
  const { value } = await params.connection.getSignatureStatuses(
    [params.signature],
    { searchTransactionHistory: true }
  );
  const status = value[0];
  if (!status) return 'not_found';
  if (status.confirmationStatus !== 'finalized') return 'pending';
  return status.err ? 'failed' : 'success';
}

/**
 * True only when the transaction can never land: the finalized block height is
 * past its `lastValidBlockHeight` and the signature is still unknown. Height is
 * read before the status re-check so every block that could contain the
 * transaction is already finalized when the status is read. RPC errors → false.
 */
export async function isSolanaTransactionExpired(params: {
  connection: SolanaSettlementConnection;
  signature: string;
  lastValidBlockHeight: number;
}): Promise<boolean> {
  try {
    const finalizedHeight = await params.connection.getBlockHeight('finalized');
    if (finalizedHeight <= params.lastValidBlockHeight) return false;
    return (await getSolanaSignatureOutcome(params)) === 'not_found';
  } catch (error) {
    console.warn('isSolanaTransactionExpired:', params.signature, error);
    return false;
  }
}

/** One status check with no waiting; RPC errors count as `pending`. */
export async function checkSolanaSignatureOutcome(params: {
  connection: SolanaSettlementConnection;
  signature: string;
}): Promise<SolanaSignatureOutcome> {
  try {
    return await getSolanaSignatureOutcome(params);
  } catch (error) {
    console.warn('getSolanaSignatureOutcome:', params.signature, error);
    return 'pending';
  }
}

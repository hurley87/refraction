import { randomUUID } from 'crypto';
import {
  encodeFunctionData,
  erc20Abi,
  http,
  hexToBigInt,
  parseAbiItem,
  parseUnits,
} from 'viem';
import { getPrivyClient } from '@/lib/api/privy';
import {
  getSpendRailBaseRpcUrl,
  getSpendRailBaseUsdcContractAddress,
} from '@/lib/spend-rail-config';
import {
  PrivyRestApiError,
  PrivyRestTransactionFailedError,
  PrivyRestTransactionTimeoutError,
  signAndSendTransaction,
  waitForTransaction,
} from '@/lib/privy-server-rest';
import { POSTER_CHECKOUT_CHAIN } from '@/lib/walletconnect-poster-direct-usdc';

export type TreasuryUsdcSubmitResult =
  | {
      ok: true;
      txHash: `0x${string}`;
      /** Safe summary of Privy REST send for server logs. */
      privySendSummary?: Record<string, unknown>;
      privyTransactionId: string;
      userOperationHash?: string | null;
      referenceId?: string;
      /** Present when waitForTransaction returned (Privy poll confirmed). */
      privyStatus?: string;
    }
  | {
      ok: true;
      /** Privy accepted the send but no on-chain hash after poll timeout; reconcile later. */
      submittedPending: true;
      privyTransactionId: string;
      userOperationHash?: string | null;
      referenceId?: string;
      privySendSummary?: Record<string, unknown>;
      lastPrivyStatus?: string | null;
    }
  | { ok: false; error: string };

const EVM_TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;
const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)'
);
const FALLBACK_SCAN_BLOCKS = 1_000n;
/** Coinbase (and other) Base RPCs reject eth_getLogs when the range exceeds 1000 blocks. */
const MAX_LOG_BLOCK_SPAN = 1_000n;

const INSUFFICIENT_NATIVE_GAS_RE =
  /insufficient\s+funds\s+for\s+gas|insufficient\s+funds/i;

/**
 * If Privy/the RPC reports missing native ETH for gas, explain that sponsorship
 * likely did not apply (funding ETH is not the intended fix).
 */
export function mapInsufficientNativeGasPrivyError(message: string): string {
  const trimmed = message.trim();
  if (!INSUFFICIENT_NATIVE_GAS_RE.test(trimmed)) {
    return trimmed;
  }
  return [
    'Privy gas sponsorship was not applied: the transaction was treated as if the wallet must pay native ETH for gas.',
    'Verify production NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_APP_SECRET match the Privy app where Base gas sponsorship is enabled.',
    'Confirm Base (eip155:8453) is enabled for sponsorship and credits are available.',
    'Ensure privy_server_wallet_id and server_wallet_address match the Privy server wallet (no mismatch with treasury_wallet_address).',
    'Confirm server sends via Privy REST `eth_sendTransaction` with `sponsor: true` (see `lib/privy-server-rest.ts`).',
    'If issues persist, confirm your Privy plan supports TEE/native gas sponsorship for server wallets on Base.',
  ].join(' ');
}

function rpcUrl(): string {
  return getSpendRailBaseRpcUrl().trim() || 'https://mainnet.base.org';
}

async function publicBaseClient() {
  const { createPublicClient } = await import('viem');
  return createPublicClient({
    chain: POSTER_CHECKOUT_CHAIN,
    transport: http(rpcUrl()),
  });
}

async function findRecentTreasuryTransferHash(params: {
  serverWalletAddress: `0x${string}`;
  recipientAddress: `0x${string}`;
  usdcAmount: number;
  fromBlock: bigint | null;
}): Promise<`0x${string}` | null> {
  const publicClient = await publicBaseClient();
  const latest = await publicClient.getBlockNumber();
  const rawAmount = parseUnits(params.usdcAmount.toFixed(6), 6);
  const fallbackFrom =
    latest > FALLBACK_SCAN_BLOCKS ? latest - FALLBACK_SCAN_BLOCKS : 0n;
  const scanFrom =
    params.fromBlock != null && params.fromBlock < latest
      ? params.fromBlock
      : fallbackFrom;

  /** For ERC-20 Transfer, `value` is the only field in `data` (from/to are indexed in topics). */
  const getTransferValue = (log: { data: `0x${string}` }) => {
    try {
      if (!log.data || log.data.length < 66) return null;
      return hexToBigInt(log.data);
    } catch {
      return null;
    }
  };

  const buildMatching = (
    chunk: Awaited<ReturnType<typeof publicClient.getLogs>>
  ) => {
    const withValue = chunk
      .map((log) => {
        const value = getTransferValue(log);
        if (value === null || value !== rawAmount) return null;
        return { log, value };
      })
      .filter(
        (x): x is { log: (typeof chunk)[number]; value: bigint } => x !== null
      );
    return withValue
      .sort((a, b) => {
        const aBlock = a.log.blockNumber ?? 0n;
        const bBlock = b.log.blockNumber ?? 0n;
        if (aBlock === bBlock) return 0;
        return aBlock > bBlock ? -1 : 1;
      })
      .map(({ log }) => log);
  };

  // Newest first so the first non-empty chunk yields the most recent transfer.
  let chunkTo = latest;
  while (chunkTo >= scanFrom) {
    const maxFrom = chunkTo - (MAX_LOG_BLOCK_SPAN - 1n);
    const fromBlock = maxFrom > scanFrom ? maxFrom : scanFrom;
    const logs = await publicClient.getLogs({
      address: getSpendRailBaseUsdcContractAddress(),
      event: TRANSFER_EVENT,
      args: {
        from: params.serverWalletAddress,
        to: params.recipientAddress,
      },
      fromBlock,
      toBlock: chunkTo,
    });
    const matching = buildMatching(logs);
    if (matching.length > 0) {
      return matching[0]!.transactionHash;
    }
    if (fromBlock === 0n) break;
    chunkTo = fromBlock - 1n;
  }

  return null;
}

export function isEvmTxHash(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && EVM_TX_HASH_RE.test(value.trim());
}

export function normalizeEvmTxHash(value: unknown): `0x${string}` | null {
  return isEvmTxHash(value) ? (value.trim() as `0x${string}`) : null;
}

export function findRecentTreasuryUsdcTransfer(params: {
  serverWalletAddress: `0x${string}`;
  recipientAddress: `0x${string}`;
  usdcAmount: number;
}): Promise<`0x${string}` | null> {
  return findRecentTreasuryTransferHash({ ...params, fromBlock: null });
}

/**
 * Submits a USDC transfer on Base from the server wallet; returns the tx hash immediately
 * so the caller can persist it before awaiting confirmation.
 */
export async function submitTreasuryUsdcTransfer(params: {
  serverWalletId: string;
  serverWalletAddress: `0x${string}`;
  recipientAddress: `0x${string}`;
  /** Human-readable USDC amount (6 decimals). */
  usdcAmount: number;
  /** Override Privy poll (e.g. tests). */
  privyHashResolveOptions?: { timeoutMs?: number; pollIntervalMs?: number };
  /** Optional Privy `reference_id` (default: random UUID). */
  referenceId?: string;
  /** When true, emit `withdraw_privy_*` logs for the admin withdraw route. */
  withdrawTelemetry?: boolean;
}): Promise<TreasuryUsdcSubmitResult> {
  const walletId = params.serverWalletId.trim();
  const expectedAddress = params.serverWalletAddress.trim().toLowerCase();
  if (!walletId || !expectedAddress) {
    return {
      ok: false,
      error:
        'Treasury transfer requires both privy_server_wallet_id and server_wallet_address.',
    };
  }

  const referenceId = params.referenceId?.trim() || randomUUID();
  const pollOpts = params.privyHashResolveOptions ?? {};
  // 10 s keeps total function time well within Vercel's 15 s default limit;
  // if Privy hasn't confirmed by then we return submittedPending and the
  // resume flow resolves the hash asynchronously.
  const timeoutMs = pollOpts.timeoutMs ?? 10_000;
  const initialPollMs = pollOpts.pollIntervalMs ?? 500;
  const logWithdraw = params.withdrawTelemetry === true;

  try {
    const privy = getPrivyClient();
    const privyWallet = await privy.walletApi.getWallet({ id: walletId });
    const privyAddress = privyWallet.address?.trim().toLowerCase();
    if (!privyAddress) {
      return {
        ok: false,
        error: 'Privy wallet response did not include an address.',
      };
    }
    if (privyAddress !== expectedAddress) {
      return {
        ok: false,
        error: `Privy wallet address mismatch: wallet ${walletId} is ${privyWallet.address} but server_wallet_address is ${params.serverWalletAddress}. Sponsored sends require matching IDs and addresses.`,
      };
    }

    const transferData = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [
        params.recipientAddress,
        parseUnits(params.usdcAmount.toFixed(6), 6),
      ],
    });

    const sent = await signAndSendTransaction({
      walletId,
      to: getSpendRailBaseUsdcContractAddress(),
      data: transferData,
      value: '0x0',
      sponsor: true,
      referenceId,
    });

    const privySendSummary: Record<string, unknown> = {
      transactionId: sent.transactionId,
      userOperationHash: sent.userOperationHash,
      hash: sent.hash,
      referenceId,
    };

    if (logWithdraw) {
      console.info('withdraw_privy_send_success', {
        walletId,
        userOperationHash: sent.userOperationHash,
        initialHash: sent.hash,
        referenceId,
      });
      console.info('withdraw_privy_transaction_id', {
        privyTransactionId: sent.transactionId,
        referenceId,
      });
    }

    console.info('submitTreasuryUsdcTransfer privy_rest_send', {
      walletId,
      transactionId: sent.transactionId,
      userOperationHash: sent.userOperationHash,
      hashEmpty: !sent.hash,
      referenceId,
    });

    try {
      const waited = await waitForTransaction(sent.transactionId, {
        timeoutMs,
        initialPollMs,
        maxPollMs: 2_000,
      });

      if (logWithdraw) {
        console.info('withdraw_privy_poll_confirmed', {
          privyTransactionId: sent.transactionId,
          privyStatus: waited.status,
          transactionHash: waited.transactionHash,
        });
      }

      return {
        ok: true,
        txHash: waited.transactionHash,
        privySendSummary,
        privyTransactionId: sent.transactionId,
        userOperationHash: sent.userOperationHash,
        referenceId,
        privyStatus: waited.status,
      };
    } catch (pollErr) {
      if (pollErr instanceof PrivyRestTransactionTimeoutError) {
        const last = pollErr.lastStatus;
        if (logWithdraw) {
          console.warn('withdraw_privy_poll_timeout', {
            privyTransactionId: pollErr.transactionId,
            referenceId,
            lastStatus: last ?? null,
          });
        }
        return {
          ok: true,
          submittedPending: true,
          privyTransactionId: sent.transactionId,
          userOperationHash: sent.userOperationHash,
          referenceId,
          privySendSummary,
          lastPrivyStatus: last ?? null,
        };
      }
      if (pollErr instanceof PrivyRestTransactionFailedError) {
        return {
          ok: false,
          error: `Privy transaction failed with status ${pollErr.status}.`,
        };
      }
      throw pollErr;
    }
  } catch (e) {
    if (e instanceof PrivyRestApiError) {
      const rawMsg = e.message;
      const msg = mapInsufficientNativeGasPrivyError(e.body || rawMsg);
      console.error('submitTreasuryUsdcTransfer PrivyRestApiError:', e);
      return { ok: false, error: msg };
    }
    const rawMsg = e instanceof Error ? e.message : 'USDC transfer failed';
    const msg = mapInsufficientNativeGasPrivyError(rawMsg);
    console.error('submitTreasuryUsdcTransfer:', e);
    return { ok: false, error: msg };
  }
}

export async function waitForTreasuryTxReceipt(
  txHash: `0x${string}`,
  timeout = 120_000
): Promise<void> {
  const publicClient = await publicBaseClient();
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    timeout,
  });
  if (receipt.status !== 'success') {
    throw new Error('Funding transaction reverted');
  }
}

export async function getTreasuryTxReceiptStatus(
  txHash: string
): Promise<'success' | 'reverted' | null> {
  if (!isEvmTxHash(txHash)) return null;

  try {
    const publicClient = await publicBaseClient();
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash.trim() as `0x${string}`,
    });
    return receipt.status === 'success' ? 'success' : 'reverted';
  } catch {
    return null;
  }
}

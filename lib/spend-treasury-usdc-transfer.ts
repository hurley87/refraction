import {
  encodeFunctionData,
  erc20Abi,
  http,
  hexToBigInt,
  parseAbiItem,
  parseUnits,
} from 'viem';
import {
  getPrivyClient,
  resolvePrivyServerTransactionHash,
} from '@/lib/api/privy';
import { SPEND_SERVER_WALLET_CAIP2 } from '@/lib/spend-server-wallet';
import {
  POSTER_CHECKOUT_USDC_ADDRESS_BASE,
  POSTER_CHECKOUT_CHAIN,
} from '@/lib/walletconnect-poster-direct-usdc';

export type TreasuryUsdcSubmitResult =
  | { ok: true; txHash: `0x${string}` }
  | { ok: false; error: string };

const EVM_TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;
const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)'
);
const FALLBACK_SCAN_BLOCKS = 1_000n;
/** Coinbase (and other) Base RPCs reject eth_getLogs when the range exceeds 1000 blocks. */
const MAX_LOG_BLOCK_SPAN = 1_000n;

type PrivyEthSendTransactionRpcResponse = {
  method?: 'eth_sendTransaction';
  data?: {
    hash?: string;
    transactionId?: string;
    transaction_id?: string;
    caip2?: string;
  };
  error?: {
    message?: string;
  };
};

function rpcUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_RPC?.trim() || 'https://mainnet.base.org';
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
      address: POSTER_CHECKOUT_USDC_ADDRESS_BASE,
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
}): Promise<TreasuryUsdcSubmitResult> {
  let fromBlock: bigint | null = null;
  try {
    fromBlock = await (await publicBaseClient()).getBlockNumber();
  } catch {
    fromBlock = null;
  }

  try {
    const transaction = {
      from: params.serverWalletAddress,
      to: POSTER_CHECKOUT_USDC_ADDRESS_BASE,
      chainId: POSTER_CHECKOUT_CHAIN.id,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [
          params.recipientAddress,
          parseUnits(params.usdcAmount.toFixed(6), 6),
        ],
      }),
      value: '0x0' as const,
    };
    const result = (await getPrivyClient().walletApi.rpc({
      walletId: params.serverWalletId,
      method: 'eth_sendTransaction',
      caip2: SPEND_SERVER_WALLET_CAIP2,
      sponsor: true,
      params: {
        transaction,
      },
    } as Parameters<
      ReturnType<typeof getPrivyClient>['walletApi']['rpc']
    >[0])) as PrivyEthSendTransactionRpcResponse;
    if (result.error) {
      return {
        ok: false,
        error: result.error.message ?? 'USDC transfer failed',
      };
    }

    const txHash = normalizeEvmTxHash(
      await resolvePrivyServerTransactionHash(result)
    );
    if (txHash) {
      return { ok: true, txHash };
    }

    const fallbackHash = await findRecentTreasuryTransferHash({
      serverWalletAddress: params.serverWalletAddress,
      recipientAddress: params.recipientAddress,
      usdcAmount: params.usdcAmount,
      fromBlock,
    });

    if (fallbackHash) {
      return { ok: true, txHash: fallbackHash };
    }

    return {
      ok: false,
      error: 'USDC transfer hash was not returned by wallet provider.',
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'USDC transfer failed';
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

import {
  encodeFunctionData,
  erc20Abi,
  http,
  parseAbiItem,
  parseUnits,
} from 'viem';
import { getPrivyClient } from '@/lib/api/privy';
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
const FALLBACK_SCAN_BLOCKS = 1_200n;

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
  const fromBlock =
    params.fromBlock != null && params.fromBlock < latest
      ? params.fromBlock
      : fallbackFrom;

  const logs = await publicClient.getLogs({
    address: POSTER_CHECKOUT_USDC_ADDRESS_BASE,
    event: TRANSFER_EVENT,
    args: {
      from: params.serverWalletAddress,
      to: params.recipientAddress,
    },
    fromBlock,
    toBlock: 'latest',
  });

  const matching = logs
    .filter((log) => log.args.value === rawAmount)
    .sort((a, b) => {
      const aBlock = a.blockNumber ?? 0n;
      const bBlock = b.blockNumber ?? 0n;
      if (aBlock === bBlock) return 0;
      return aBlock > bBlock ? -1 : 1;
    });

  return matching[0]?.transactionHash ?? null;
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
    const result = await getPrivyClient().walletApi.ethereum.sendTransaction({
      walletId: params.serverWalletId,
      caip2: SPEND_SERVER_WALLET_CAIP2,
      sponsor: true,
      transaction: {
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
        value: '0x0',
      },
    });
    const txHash = normalizeEvmTxHash(result.hash);
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

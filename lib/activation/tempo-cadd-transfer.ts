import {
  decodeEventLog,
  defineChain,
  encodeFunctionData,
  getAddress,
  http,
  isAddress,
  keccak256,
  parseAbi,
  parseUnits,
  toBytes,
} from 'viem';
import { getPrivyClient } from '@/lib/api/privy';
import {
  PrivyRestApiError,
  PrivyRestTransactionFailedError,
  PrivyRestTransactionTimeoutError,
  signAndSendTempoTransaction,
  waitForTransaction,
} from '@/lib/privy-server-rest';
import {
  getTempoRpcUrl,
  TEMPO_CADD_CONTRACT_ADDRESS,
  TEMPO_CADD_DECIMALS,
  TEMPO_MAINNET_CHAIN_ID,
} from '@/lib/activation/tempo-config';
import type { TreasuryUsdcSubmitResult } from '@/lib/spend-treasury-usdc-transfer';

const TEMPO_TIP20_ABI = parseAbi([
  'function transferWithMemo(address to, uint256 amount, bytes32 memo)',
  'event TransferWithMemo(address indexed from, address indexed to, uint256 amount, bytes32 indexed memo)',
]);
const FALLBACK_SCAN_BLOCKS = 2_000n;

const tempoMainnet = defineChain({
  id: TEMPO_MAINNET_CHAIN_ID,
  name: 'Tempo Mainnet',
  nativeCurrency: { name: 'USD', symbol: 'USD', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.tempo.xyz'] } },
  blockExplorers: {
    default: { name: 'Tempo Explorer', url: 'https://explore.tempo.xyz' },
  },
});

async function publicTempoClient() {
  const { createPublicClient } = await import('viem');
  return createPublicClient({
    chain: tempoMainnet,
    transport: http(getTempoRpcUrl()),
  });
}

export function tempoSettlementMemo(settlementId: string): `0x${string}` {
  const normalized = settlementId.trim();
  if (!normalized) {
    throw new Error('tempoSettlementMemo: settlementId is required');
  }
  return keccak256(toBytes(normalized));
}

function normalizeCaddAddress(address?: string | null): `0x${string}` | null {
  const value = address?.trim() || TEMPO_CADD_CONTRACT_ADDRESS;
  return isAddress(value) ? getAddress(value as `0x${string}`) : null;
}

export async function submitTempoCaddTransfer(params: {
  serverWalletId: string;
  serverWalletAddress: `0x${string}`;
  recipientAddress: `0x${string}`;
  caddAmount: number;
  settlementId: string;
  caddContractAddress?: string | null;
  referenceId?: string;
  privyHashResolveOptions?: { timeoutMs?: number; pollIntervalMs?: number };
}): Promise<TreasuryUsdcSubmitResult> {
  const walletId = params.serverWalletId.trim();
  const expectedAddress = params.serverWalletAddress.trim().toLowerCase();
  if (!walletId || !expectedAddress) {
    return {
      ok: false,
      error: 'Tempo transfer requires a Privy wallet ID and wallet address.',
    };
  }
  const caddContract = normalizeCaddAddress(params.caddContractAddress);
  if (!caddContract) {
    return { ok: false, error: 'Invalid Tempo CADD contract address.' };
  }

  try {
    const wallet = await getPrivyClient().walletApi.getWallet({ id: walletId });
    if (wallet.address?.trim().toLowerCase() !== expectedAddress) {
      return {
        ok: false,
        error: `Privy wallet address mismatch for Tempo campaign wallet ${walletId}.`,
      };
    }

    const memo = tempoSettlementMemo(params.settlementId);
    const data = encodeFunctionData({
      abi: TEMPO_TIP20_ABI,
      functionName: 'transferWithMemo',
      args: [
        params.recipientAddress,
        parseUnits(
          params.caddAmount.toFixed(TEMPO_CADD_DECIMALS),
          TEMPO_CADD_DECIMALS
        ),
        memo,
      ],
    });
    const sent = await signAndSendTempoTransaction({
      walletId,
      calls: [{ to: caddContract, data, value: '0x0' }],
      sponsor: true,
      referenceId: params.referenceId,
    });
    const summary = {
      transactionId: sent.transactionId,
      userOperationHash: sent.userOperationHash,
      hash: sent.hash,
      memo,
      referenceId: params.referenceId,
    };

    try {
      const options = params.privyHashResolveOptions ?? {};
      const waited = await waitForTransaction(sent.transactionId, {
        timeoutMs: options.timeoutMs ?? 10_000,
        initialPollMs: options.pollIntervalMs ?? 500,
        maxPollMs: 2_000,
      });
      return {
        ok: true,
        txHash: waited.transactionHash,
        privyTransactionId: sent.transactionId,
        userOperationHash: sent.userOperationHash,
        referenceId: params.referenceId,
        privySendSummary: summary,
        privyStatus: waited.status,
      };
    } catch (error) {
      if (error instanceof PrivyRestTransactionTimeoutError) {
        return {
          ok: true,
          submittedPending: true,
          privyTransactionId: sent.transactionId,
          userOperationHash: sent.userOperationHash,
          referenceId: params.referenceId,
          privySendSummary: summary,
          lastPrivyStatus: error.lastStatus,
        };
      }
      if (error instanceof PrivyRestTransactionFailedError) {
        return {
          ok: false,
          error: `Privy Tempo transaction failed with status ${error.status}.`,
        };
      }
      throw error;
    }
  } catch (error) {
    const message =
      error instanceof PrivyRestApiError
        ? error.body || error.message
        : error instanceof Error
          ? error.message
          : 'Tempo CADD transfer failed';
    console.error('submitTempoCaddTransfer:', error);
    return { ok: false, error: message };
  }
}

type TempoTransferMatch = {
  from: `0x${string}`;
  to: `0x${string}`;
  amount: bigint;
  memo: `0x${string}`;
};

export function hasMatchingTempoCaddTransferLog(
  logs: readonly {
    address: `0x${string}`;
    data: `0x${string}`;
    topics: readonly `0x${string}`[];
  }[],
  params: TempoTransferMatch & { caddContract: `0x${string}` }
): boolean {
  return logs.some((log) => {
    if (getAddress(log.address) !== params.caddContract) return false;
    if (log.topics.length === 0) return false;
    try {
      const decoded = decodeEventLog({
        abi: TEMPO_TIP20_ABI,
        eventName: 'TransferWithMemo',
        data: log.data,
        topics: [...log.topics] as [
          signature: `0x${string}`,
          ...args: `0x${string}`[],
        ],
      });
      return (
        getAddress(decoded.args.from) === params.from &&
        getAddress(decoded.args.to) === params.to &&
        decoded.args.amount === params.amount &&
        decoded.args.memo.toLowerCase() === params.memo.toLowerCase()
      );
    } catch {
      return false;
    }
  });
}

export async function getTempoCaddTransferStatus(params: {
  txHash: `0x${string}`;
  campaignAddress: `0x${string}`;
  recipientAddress: `0x${string}`;
  caddAmount: number;
  settlementId: string;
  caddContractAddress?: string | null;
}): Promise<'success' | 'reverted' | 'mismatch' | null> {
  const caddContract = normalizeCaddAddress(params.caddContractAddress);
  if (!caddContract) return 'mismatch';
  try {
    const client = await publicTempoClient();
    const receipt = await client.getTransactionReceipt({ hash: params.txHash });
    if (receipt.status !== 'success') return 'reverted';
    const match: TempoTransferMatch = {
      from: getAddress(params.campaignAddress),
      to: getAddress(params.recipientAddress),
      amount: parseUnits(
        params.caddAmount.toFixed(TEMPO_CADD_DECIMALS),
        TEMPO_CADD_DECIMALS
      ),
      memo: tempoSettlementMemo(params.settlementId),
    };
    return hasMatchingTempoCaddTransferLog(receipt.logs, {
      ...match,
      caddContract,
    })
      ? 'success'
      : 'mismatch';
  } catch {
    return null;
  }
}

export async function findTempoCaddTransfer(params: {
  campaignAddress: `0x${string}`;
  recipientAddress: `0x${string}`;
  caddAmount: number;
  settlementId: string;
  caddContractAddress?: string | null;
}): Promise<`0x${string}` | null> {
  const caddContract = normalizeCaddAddress(params.caddContractAddress);
  if (!caddContract) return null;
  const client = await publicTempoClient();
  const latest = await client.getBlockNumber();
  const fromBlock =
    latest > FALLBACK_SCAN_BLOCKS ? latest - FALLBACK_SCAN_BLOCKS : 0n;
  const logs = await client.getLogs({
    address: caddContract,
    event: TEMPO_TIP20_ABI[1],
    args: {
      from: getAddress(params.campaignAddress),
      to: getAddress(params.recipientAddress),
      memo: tempoSettlementMemo(params.settlementId),
    },
    fromBlock,
    toBlock: latest,
  });
  const amount = parseUnits(
    params.caddAmount.toFixed(TEMPO_CADD_DECIMALS),
    TEMPO_CADD_DECIMALS
  );
  const match = [...logs]
    .reverse()
    .find((log) => log.args.amount === amount && log.transactionHash);
  return match?.transactionHash ?? null;
}

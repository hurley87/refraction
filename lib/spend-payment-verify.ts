import {
  createPublicClient,
  decodeEventLog,
  erc20Abi,
  http,
  parseUnits,
} from 'viem';
import {
  POSTER_CHECKOUT_CHAIN,
  POSTER_CHECKOUT_USDC_ADDRESS_BASE,
} from '@/lib/walletconnect-poster-direct-usdc';

export type SpendPaymentTxVerifyResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Confirms a Base USDC transfer receipt: success, token, from, to, and amount (6 decimals).
 */
export async function verifySpendUsdcPaymentTx(params: {
  txHash: `0x${string}`;
  expectedFrom: `0x${string}`;
  expectedTo: `0x${string}`;
  /** Human-readable USDC (must match on-chain 6-decimal amount). */
  expectedUsdcAmount: number;
}): Promise<SpendPaymentTxVerifyResult> {
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC?.trim();
  if (!rpcUrl) {
    return { ok: false, reason: 'RPC not configured' };
  }

  const publicClient = createPublicClient({
    chain: POSTER_CHECKOUT_CHAIN,
    transport: http(rpcUrl),
  });

  let receipt;
  try {
    receipt = await publicClient.waitForTransactionReceipt({
      hash: params.txHash,
      timeout: 120_000,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'receipt wait failed';
    return { ok: false, reason: msg };
  }

  if (receipt.status !== 'success') {
    return { ok: false, reason: 'transaction_reverted' };
  }

  const expectedRaw = parseUnits(params.expectedUsdcAmount.toFixed(6), 6);
  const fromLower = params.expectedFrom.toLowerCase();
  const toLower = params.expectedTo.toLowerCase();

  for (const log of receipt.logs) {
    if (
      log.address.toLowerCase() !==
      POSTER_CHECKOUT_USDC_ADDRESS_BASE.toLowerCase()
    ) {
      continue;
    }
    try {
      const decoded = decodeEventLog({
        abi: erc20Abi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== 'Transfer') continue;
      const args = decoded.args as {
        from: `0x${string}`;
        to: `0x${string}`;
        value: bigint;
      };
      if (
        args.from.toLowerCase() === fromLower &&
        args.to.toLowerCase() === toLower &&
        args.value === expectedRaw
      ) {
        return { ok: true };
      }
    } catch {
      // not a Transfer on USDC ABI
    }
  }

  return { ok: false, reason: 'no_matching_usdc_transfer' };
}

import { encodeFunctionData, erc20Abi, http, parseUnits } from 'viem';
import { getPrivyClient } from '@/lib/api/privy';
import { SPEND_SERVER_WALLET_CAIP2 } from '@/lib/spend-server-wallet';
import {
  POSTER_CHECKOUT_USDC_ADDRESS_BASE,
  POSTER_CHECKOUT_CHAIN,
} from '@/lib/walletconnect-poster-direct-usdc';

export type TreasuryUsdcSubmitResult =
  | { ok: true; txHash: `0x${string}` }
  | { ok: false; error: string };

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
  const rawAmount = parseUnits(params.usdcAmount.toFixed(6), 6);

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
          args: [params.recipientAddress, rawAmount],
        }),
        value: '0x0',
      },
    });
    return { ok: true, txHash: result.hash as `0x${string}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'USDC transfer failed';
    console.error('submitTreasuryUsdcTransfer:', e);
    return { ok: false, error: msg };
  }
}

export async function waitForTreasuryTxReceipt(
  txHash: `0x${string}`
): Promise<void> {
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC?.trim();
  if (!rpcUrl) {
    throw new Error('RPC not configured');
  }
  const { createPublicClient } = await import('viem');
  const publicClient = createPublicClient({
    chain: POSTER_CHECKOUT_CHAIN,
    transport: http(rpcUrl),
  });
  await publicClient.waitForTransactionReceipt({
    hash: txHash,
    timeout: 120_000,
  });
}

import {
  createPublicClient,
  createWalletClient,
  erc20Abi,
  http,
  parseUnits,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getServerPrivateKey } from '@/lib/server-private-key';
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
  recipientAddress: `0x${string}`;
  /** Human-readable USDC amount (6 decimals). */
  usdcAmount: number;
}): Promise<TreasuryUsdcSubmitResult> {
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC?.trim();
  if (!rpcUrl) {
    return { ok: false, error: 'RPC not configured' };
  }

  const pk = getServerPrivateKey();
  if (!pk) {
    return { ok: false, error: 'Server wallet not configured' };
  }

  const trimmedPk = pk.startsWith('0x') ? pk : `0x${pk}`;
  let account;
  try {
    account = privateKeyToAccount(trimmedPk as `0x${string}`);
  } catch {
    return { ok: false, error: 'Invalid server wallet key' };
  }

  const transport = http(rpcUrl);
  const walletClient = createWalletClient({
    account,
    chain: POSTER_CHECKOUT_CHAIN,
    transport,
  });

  const rawAmount = parseUnits(params.usdcAmount.toFixed(6), 6);

  try {
    const hash = await walletClient.writeContract({
      account,
      address: POSTER_CHECKOUT_USDC_ADDRESS_BASE,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [params.recipientAddress, rawAmount],
      chain: POSTER_CHECKOUT_CHAIN,
    });
    return { ok: true, txHash: hash };
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
  const publicClient = createPublicClient({
    chain: POSTER_CHECKOUT_CHAIN,
    transport: http(rpcUrl),
  });
  await publicClient.waitForTransactionReceipt({
    hash: txHash,
    timeout: 120_000,
  });
}

/**
 * Address derived from `SERVER_WALLET_PRIVATE_KEY` / `SERVER_PRIVATE_KEY`, or null if missing/invalid.
 */
export function getServerWalletAddress(): `0x${string}` | null {
  const pk = getServerPrivateKey();
  if (!pk) return null;
  const trimmed = pk.startsWith('0x') ? pk : `0x${pk}`;
  try {
    return privateKeyToAccount(trimmed as `0x${string}`).address;
  } catch {
    return null;
  }
}

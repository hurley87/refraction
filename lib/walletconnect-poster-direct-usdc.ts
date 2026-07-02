import {
  createPublicClient,
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  http,
  parseUnits,
} from 'viem';
import { base } from 'viem/chains';

/** Official USDC on Base mainnet (same chain as Privy `supportedChains` in providers). */
export const POSTER_CHECKOUT_USDC_ADDRESS_BASE =
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;

export const POSTER_CHECKOUT_CHAIN = base;
export const POSTER_CHECKOUT_CHAIN_ID = base.id;

/** Minimum USDC balance (in human-readable units) required to proceed without a warning. */
export const USDC_WARNING_THRESHOLD = 0.01;

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function isEvmAddress(value: string): boolean {
  return EVM_ADDRESS_RE.test(value.trim());
}

/** 1 USDC (6 decimals). */
export function encodePosterUsdcTransferData(
  recipient: `0x${string}`
): `0x${string}` {
  return encodeUsdcTransferData(recipient, 1);
}

/** ERC-20 `transfer` calldata for USDC (6 decimals) on Base. */
export function encodeUsdcTransferData(
  recipient: `0x${string}`,
  /** Human-readable USDC amount (e.g. 5.25). */
  usdcAmount: number
): `0x${string}` {
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [recipient, parseUnits(usdcAmount.toFixed(6), 6)],
  });
}

/**
 * Reads the USDC balance on Base mainnet for a given address.
 * Returns the balance as a human-readable number (e.g. 1.23 for 1.23 USDC).
 */
export async function fetchUsdcBalanceOnBase(
  walletAddress: `0x${string}`,
  options?: {
    rpcUrl?: string;
    usdcContract?: `0x${string}`;
    /** ERC-20 decimals for `usdcContract` (default 6, i.e. USDC). */
    decimals?: number;
  }
): Promise<number> {
  const rpcUrl =
    options?.rpcUrl ?? process.env.NEXT_PUBLIC_BASE_RPC?.trim() ?? undefined;
  const client = createPublicClient({
    chain: base,
    transport: rpcUrl ? http(rpcUrl) : http(),
  });
  const contract = options?.usdcContract ?? POSTER_CHECKOUT_USDC_ADDRESS_BASE;
  const decimals = options?.decimals ?? 6;
  const raw = await client.readContract({
    address: contract,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [walletAddress],
  });
  return parseFloat(formatUnits(raw, decimals));
}

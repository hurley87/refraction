import { getAddress, isAddress } from 'viem';

/**
 * If `input` is a valid EVM address, returns its EIP-55 checksummed form.
 * Otherwise returns null (e.g. Solana / Stellar addresses).
 */
export function tryNormalizeEvmAddress(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  if (!isAddress(t)) return null;
  return getAddress(t as `0x${string}`);
}

/**
 * True when both strings refer to the same wallet: EIP-55–aware for EVM,
 * exact trimmed match otherwise (non-EVM chains).
 */
export function sameWalletAddress(a: string, b: string): boolean {
  const x = a.trim();
  const y = b.trim();
  if (!x || !y) return false;
  const xEvm = tryNormalizeEvmAddress(x);
  const yEvm = tryNormalizeEvmAddress(y);
  if (xEvm && yEvm) return xEvm === yEvm;
  return x === y;
}

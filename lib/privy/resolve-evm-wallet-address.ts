import type { User } from '@privy-io/react-auth';
import { tryNormalizeEvmAddress } from '@/lib/utils/wallets';

type WalletAddressSource = { address?: string | null };

function evmAddressFromLinkedAccount(account: unknown): string | null {
  if (!account || typeof account !== 'object') return null;
  const record = account as Record<string, unknown>;
  if (record.type !== 'wallet' || typeof record.address !== 'string') {
    return null;
  }
  const chainType = record.chainType;
  if (
    chainType === 'stellar' ||
    chainType === 'solana' ||
    chainType === 'aptos'
  ) {
    return null;
  }
  return tryNormalizeEvmAddress(record.address);
}

/**
 * Resolves the user's EVM wallet for spend / activation APIs.
 * Privy `user.wallet` may point at a Stellar or Solana linked account when that
 * chain was used for check-in; spend flows require a `0x` address.
 */
export function resolvePrivyEvmWalletAddress(
  user: User | null | undefined,
  connectedWallets?: WalletAddressSource[]
): string | undefined {
  const seen = new Set<string>();

  const push = (value: string | null | undefined) => {
    const normalized = value ? tryNormalizeEvmAddress(value) : null;
    if (normalized) seen.add(normalized);
  };

  // Preserve Privy's active wallet when it is already EVM. If the active
  // wallet is another chain, fall back to the user's linked EVM accounts.
  push(user?.wallet?.address);

  for (const account of user?.linkedAccounts ?? []) {
    push(evmAddressFromLinkedAccount(account));
  }

  for (const wallet of connectedWallets ?? []) {
    push(wallet.address);
  }

  return seen.values().next().value;
}

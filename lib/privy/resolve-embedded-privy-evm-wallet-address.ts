import type { User } from '@privy-io/react-auth';
import { tryNormalizeEvmAddress } from '@/lib/utils/wallets';

/** Privy embedded EVM address for export flows (not external connected wallets). */
export function resolveEmbeddedPrivyEvmWalletAddress(
  user: User | null | undefined
): string | undefined {
  for (const account of user?.linkedAccounts ?? []) {
    if (
      account.type !== 'wallet' ||
      account.walletClientType !== 'privy' ||
      account.chainType !== 'ethereum' ||
      !('address' in account) ||
      typeof account.address !== 'string'
    ) {
      continue;
    }

    const normalized = tryNormalizeEvmAddress(account.address);
    if (normalized) return normalized;
  }

  return undefined;
}

import { useMemo } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { resolvePrivyEvmWalletAddress } from '@/lib/privy/resolve-evm-wallet-address';

/** EVM `0x` address for the signed-in Privy user (spend / activation APIs). */
export function useEvmWalletAddress(): string | undefined {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  return useMemo(
    () => resolvePrivyEvmWalletAddress(user, wallets),
    [user, wallets]
  );
}

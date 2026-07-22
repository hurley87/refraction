import { useMemo } from 'react';
import { useWallets } from '@privy-io/react-auth';
import {
  findConnectedEvmWallet,
  type FindConnectedEvmWalletOptions,
} from '@/lib/privy/find-connected-evm-wallet';
import { useEvmWalletAddress } from '@/hooks/use-evm-wallet-address';

/** Connected Privy wallet object for the user's canonical EVM address. */
export function useConnectedEvmWallet(options?: FindConnectedEvmWalletOptions) {
  const { wallets } = useWallets();
  const address = useEvmWalletAddress();
  const preferEmbeddedPrivy = options?.preferEmbeddedPrivy ?? false;

  return useMemo(
    () =>
      findConnectedEvmWallet(wallets, address, {
        preferEmbeddedPrivy,
      }),
    [wallets, address, preferEmbeddedPrivy]
  );
}

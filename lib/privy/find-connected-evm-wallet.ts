import { sameWalletAddress } from '@/lib/utils/wallets';

export type WalletAddressSource = {
  address: string;
  walletClientType?: string;
};

export type FindConnectedEvmWalletOptions = {
  /** Prefer the Privy embedded wallet when multiple connected wallets match. */
  preferEmbeddedPrivy?: boolean;
};

/** Resolves the connected Privy wallet object for a canonical EVM address. */
export function findConnectedEvmWallet<T extends WalletAddressSource>(
  wallets: T[],
  resolvedAddress: string | undefined,
  options?: FindConnectedEvmWalletOptions
): T | null {
  if (!resolvedAddress) return null;

  if (options?.preferEmbeddedPrivy) {
    const embedded = wallets.find(
      (wallet) =>
        wallet.walletClientType === 'privy' &&
        sameWalletAddress(resolvedAddress, wallet.address)
    );
    if (embedded) return embedded;
  }

  return (
    wallets.find((wallet) =>
      sameWalletAddress(resolvedAddress, wallet.address)
    ) ?? null
  );
}

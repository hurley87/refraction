import { getPrivyClient } from '@/lib/api/privy';
import {
  createOrUpdatePlayerForStellar,
  getPlayerByEmail,
} from '@/lib/db/players';

export type EnsureStellarRailUserWalletResult = {
  address: string;
  walletId?: string;
  /** True when a new Privy Stellar wallet was created in this call. */
  provisioned: boolean;
};

/**
 * Resolves the canonical Stellar account for spend flows (same order as GET /api/stellar-wallet),
 * or creates a Privy-managed Stellar wallet and persists it (same semantics as POST /api/stellar-wallet).
 */
export async function ensureStellarRailUserWallet(
  privyUserId: string
): Promise<EnsureStellarRailUserWalletResult> {
  const privy = getPrivyClient();
  const user = await privy.getUser(privyUserId);

  const email = user.email?.address;
  if (email) {
    const player = await getPlayerByEmail(email);
    if (player?.stellar_wallet_address) {
      return {
        address: player.stellar_wallet_address,
        walletId: player.stellar_wallet_id ?? undefined,
        provisioned: false,
      };
    }
  }

  const existingStellarWallet = user.linkedAccounts?.find(
    (account) =>
      account.type === 'wallet' &&
      'chainType' in account &&
      account.chainType === 'stellar'
  );

  if (existingStellarWallet && 'address' in existingStellarWallet) {
    const rawId =
      'id' in existingStellarWallet ? existingStellarWallet.id : undefined;
    const walletId = rawId == null ? undefined : String(rawId);
    await createOrUpdatePlayerForStellar(
      existingStellarWallet.address,
      email,
      walletId
    );

    return {
      address: existingStellarWallet.address,
      walletId,
      provisioned: false,
    };
  }

  const wallet = await privy.walletApi.create({
    chainType: 'stellar',
  });

  await createOrUpdatePlayerForStellar(wallet.address, email, wallet.id);

  return {
    address: wallet.address,
    walletId: wallet.id,
    provisioned: true,
  };
}

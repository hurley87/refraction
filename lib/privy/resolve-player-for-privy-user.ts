import type { User } from '@privy-io/server-auth';
import {
  createOrUpdatePlayer,
  getPlayerByAptosWallet,
  getPlayerByEmail,
  getPlayerBySolanaWallet,
  getPlayerByStellarWallet,
  getPlayerByWallet,
} from '@/lib/db/players';
import { supabase } from '@/lib/db/client';
import type { Player } from '@/lib/types';
import { tryNormalizeEvmAddress } from '@/lib/utils/wallets';

function linkedWalletAddress(
  user: User,
  chainType: 'stellar' | 'solana' | 'aptos'
): string | null {
  for (const account of user.linkedAccounts ?? []) {
    if (account.type !== 'wallet' || !('address' in account)) continue;
    if (
      'chainType' in account &&
      (account as { chainType?: string }).chainType === chainType
    ) {
      const trimmed = String(account.address).trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

async function backfillEvmWalletOnPlayer(
  player: Player,
  evmWalletAddress: string
): Promise<Player> {
  if (player.wallet_address?.trim()) return player;
  const wallet =
    tryNormalizeEvmAddress(evmWalletAddress.trim()) ?? evmWalletAddress.trim();
  const { data, error } = await supabase
    .from('players')
    .update({
      wallet_address: wallet,
      updated_at: new Date().toISOString(),
    })
    .eq('id', player.id)
    .select(
      'id, wallet_address, solana_wallet_address, stellar_wallet_address, stellar_wallet_id, aptos_wallet_address, aptos_wallet_id, email, username, total_points, created_at, updated_at'
    )
    .single();
  if (error) throw error;
  return data;
}

/**
 * Finds the player row that owns points for this Privy session, even when the
 * user checked in with Stellar/Solana and `players.wallet_address` was never set.
 */
export async function resolvePlayerForPrivyUser(
  evmWalletAddress: string,
  privyUser: User
): Promise<Player> {
  const normalized =
    tryNormalizeEvmAddress(evmWalletAddress.trim()) ?? evmWalletAddress.trim();

  const byEvm = await getPlayerByWallet(normalized);
  if (byEvm?.id) return byEvm;

  const email = privyUser.email?.address?.trim().toLowerCase();
  if (email) {
    const byEmail = await getPlayerByEmail(email);
    if (byEmail?.id) {
      return backfillEvmWalletOnPlayer(byEmail, normalized);
    }
  }

  const stellarAddress = linkedWalletAddress(privyUser, 'stellar');
  if (stellarAddress) {
    const byStellar = await getPlayerByStellarWallet(stellarAddress);
    if (byStellar?.id) {
      return backfillEvmWalletOnPlayer(byStellar, normalized);
    }
  }

  const solanaAddress = linkedWalletAddress(privyUser, 'solana');
  if (solanaAddress) {
    const bySolana = await getPlayerBySolanaWallet(solanaAddress);
    if (bySolana?.id) {
      return backfillEvmWalletOnPlayer(bySolana, normalized);
    }
  }

  const aptosAddress = linkedWalletAddress(privyUser, 'aptos');
  if (aptosAddress) {
    const byAptos = await getPlayerByAptosWallet(aptosAddress);
    if (byAptos?.id) {
      return backfillEvmWalletOnPlayer(byAptos, normalized);
    }
  }

  return createOrUpdatePlayer({
    wallet_address: normalized,
    email: email || undefined,
    total_points: 0,
  });
}

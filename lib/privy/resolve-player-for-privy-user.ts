import type { User } from '@privy-io/server-auth';
import {
  assignEvmWalletToPlayer,
  createOrUpdatePlayer,
  getPlayerByAptosWallet,
  getPlayerByEmail,
  getPlayerBySolanaWallet,
  getPlayerByStellarWallet,
  getPlayerByWallet,
} from '@/lib/db/players';
import type { Player } from '@/lib/types';
import { sameWalletAddress, tryNormalizeEvmAddress } from '@/lib/utils/wallets';

export type ResolvePlayerForPrivyUserResult = {
  player: Player;
  /** True when a new `players` row was inserted for this session. */
  created: boolean;
};

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

/** Login email from Privy `email` or linked social accounts. */
export function privyLoginEmail(user: User): string | undefined {
  const direct = user.email?.address?.trim().toLowerCase();
  if (direct) return direct;

  for (const account of user.linkedAccounts ?? []) {
    if (!account || typeof account !== 'object') continue;
    if (!('email' in account)) continue;
    const raw = (account as { email?: unknown }).email;
    if (typeof raw !== 'string') continue;
    const email = raw.trim().toLowerCase();
    if (email) return email;
  }

  return undefined;
}

async function backfillEvmWalletOnPlayer(
  player: Player,
  evmWalletAddress: string
): Promise<Player> {
  const wallet =
    tryNormalizeEvmAddress(evmWalletAddress.trim()) ?? evmWalletAddress.trim();
  const storedWallet = player.wallet_address?.trim();
  if (storedWallet && sameWalletAddress(storedWallet, wallet)) return player;
  return assignEvmWalletToPlayer(player.id, wallet);
}

async function ensurePlayerEmail(
  player: Player,
  email: string | undefined
): Promise<Player> {
  if (!email || player.email?.trim()) return player;
  const wallet =
    tryNormalizeEvmAddress(player.wallet_address?.trim() ?? '') ??
    player.wallet_address?.trim();
  if (!wallet) return player;
  return createOrUpdatePlayer(
    {
      wallet_address: wallet,
      email,
      username: player.username,
      total_points: player.total_points ?? 0,
    },
    player
  );
}

/**
 * Finds the player row that owns points for this Privy session, even when the
 * user checked in with Stellar/Solana and `players.wallet_address` was never set.
 * Creates a player when needed and backfills missing email from Privy.
 */
export async function resolvePlayerForPrivyUser(
  evmWalletAddress: string,
  privyUser: User
): Promise<ResolvePlayerForPrivyUserResult> {
  const normalized =
    tryNormalizeEvmAddress(evmWalletAddress.trim()) ?? evmWalletAddress.trim();
  const email = privyLoginEmail(privyUser);

  const byEvm = await getPlayerByWallet(normalized);
  if (byEvm?.id) {
    return {
      player: await ensurePlayerEmail(byEvm, email),
      created: false,
    };
  }

  const stellarAddress = linkedWalletAddress(privyUser, 'stellar');
  if (stellarAddress) {
    const byStellar = await getPlayerByStellarWallet(stellarAddress);
    if (byStellar?.id) {
      const withWallet = await backfillEvmWalletOnPlayer(byStellar, normalized);
      return {
        player: await ensurePlayerEmail(withWallet, email),
        created: false,
      };
    }
  }

  const solanaAddress = linkedWalletAddress(privyUser, 'solana');
  if (solanaAddress) {
    const bySolana = await getPlayerBySolanaWallet(solanaAddress);
    if (bySolana?.id) {
      const withWallet = await backfillEvmWalletOnPlayer(bySolana, normalized);
      return {
        player: await ensurePlayerEmail(withWallet, email),
        created: false,
      };
    }
  }

  const aptosAddress = linkedWalletAddress(privyUser, 'aptos');
  if (aptosAddress) {
    const byAptos = await getPlayerByAptosWallet(aptosAddress);
    if (byAptos?.id) {
      const withWallet = await backfillEvmWalletOnPlayer(byAptos, normalized);
      return {
        player: await ensurePlayerEmail(withWallet, email),
        created: false,
      };
    }
  }

  if (email) {
    const byEmail = await getPlayerByEmail(email);
    if (byEmail?.id) {
      return {
        player: await backfillEvmWalletOnPlayer(byEmail, normalized),
        created: false,
      };
    }
  }

  const player = await createOrUpdatePlayer({
    wallet_address: normalized,
    email: email || undefined,
    total_points: 0,
  });
  return { player, created: true };
}

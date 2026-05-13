import { getPrivyClient } from '@/lib/api/privy';
import {
  createOrUpdatePlayerForStellar,
  getPlayerByEmail,
  getPlayerByStellarWallet,
  getPlayersByEvmWalletCaseInsensitive,
  updatePlayerStellarWalletMetadata,
} from '@/lib/db/players';
import type { Player } from '@/lib/types';

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

/**
 * Resolves the Privy Stellar embedded wallet id for a known G-address (server-side).
 */
export async function resolveStellarPrivyWalletIdForUser(
  privyUserId: string,
  canonicalAddress: string
): Promise<string> {
  const wanted = canonicalAddress.trim();
  const stellarAddressSuffix = wanted.slice(-8);
  const dbPlayer = await getPlayerByStellarWallet(wanted);
  const dbWalletId = dbPlayer?.stellar_wallet_id?.trim();
  if (dbWalletId) {
    logStellarWalletIdResolution({
      privyUserId,
      stellarAddressSuffix,
      dbLookupFoundWalletId: true,
      privyLinkedAccountsFoundWalletId: false,
      outcome: 'db_match',
    });
    return dbWalletId;
  }

  const privy = getPrivyClient();
  const user = await privy.getUser(privyUserId);
  const linked = user.linkedAccounts?.find((a) => {
    if (a.type !== 'wallet' || !('chainType' in a)) return false;
    if (a.chainType !== 'stellar') return false;
    if (!('address' in a) || typeof a.address !== 'string') return false;
    return a.address.trim() === wanted;
  });
  if (linked && 'id' in linked && linked.id != null && linked.id !== '') {
    const walletId = String(linked.id);
    const backfillPlayer = await resolvePlayerForStellarWalletIdBackfill(
      dbPlayer,
      wanted,
      user
    );
    const backfillPlayerId = backfillPlayer?.id;
    if (backfillPlayerId != null) {
      try {
        await updatePlayerStellarWalletMetadata(backfillPlayerId, {
          stellarWalletAddress: wanted,
          stellarWalletId: walletId,
        });
      } catch (e) {
        console.warn('resolveStellarPrivyWalletIdForUser backfill failed:', {
          privyUserId,
          stellar_address_suffix: stellarAddressSuffix,
          player_id: backfillPlayerId,
          error_name: e instanceof Error ? e.name : 'Unknown',
          error_message: e instanceof Error ? e.message : String(e),
        });
      }
    }
    logStellarWalletIdResolution({
      privyUserId,
      stellarAddressSuffix,
      dbLookupFoundWalletId: false,
      privyLinkedAccountsFoundWalletId: true,
      outcome:
        backfillPlayerId != null ? 'privy_match_backfilled' : 'privy_match',
    });
    return walletId;
  }
  logStellarWalletIdResolution({
    privyUserId,
    stellarAddressSuffix,
    dbLookupFoundWalletId: false,
    privyLinkedAccountsFoundWalletId: false,
    outcome: 'unresolved',
  });
  throw new Error('stellar_privy_wallet_id_unresolved');
}

type StellarWalletIdResolutionOutcome =
  | 'db_match'
  | 'privy_match'
  | 'privy_match_backfilled'
  | 'unresolved';

function logStellarWalletIdResolution(input: {
  privyUserId: string;
  stellarAddressSuffix: string;
  dbLookupFoundWalletId: boolean;
  privyLinkedAccountsFoundWalletId: boolean;
  outcome: StellarWalletIdResolutionOutcome;
}) {
  console.info('resolveStellarPrivyWalletIdForUser:', {
    privyUserId: input.privyUserId,
    stellar_address_suffix: input.stellarAddressSuffix,
    db_lookup_found_wallet_id: input.dbLookupFoundWalletId,
    privy_linked_accounts_found_wallet_id:
      input.privyLinkedAccountsFoundWalletId,
    outcome: input.outcome,
  });
}

function linkedEvmAddresses(user: { linkedAccounts?: unknown[] }): string[] {
  const seen = new Set<string>();
  for (const account of user.linkedAccounts ?? []) {
    const record =
      account && typeof account === 'object'
        ? (account as Record<string, unknown>)
        : null;
    if (!record) continue;
    if (
      record.type !== 'wallet' ||
      typeof record.address !== 'string' ||
      record.chainType === 'stellar'
    ) {
      continue;
    }
    const trimmed = record.address.trim();
    if (trimmed) seen.add(trimmed);
  }
  return Array.from(seen);
}

async function resolvePlayerForStellarWalletIdBackfill(
  dbPlayer: Player | null,
  wantedStellarAddress: string,
  user: { linkedAccounts?: unknown[] }
): Promise<Player | null> {
  if (
    dbPlayer?.stellar_wallet_address?.trim() === wantedStellarAddress &&
    !dbPlayer.stellar_wallet_id?.trim()
  ) {
    return dbPlayer;
  }

  const evmAddresses = linkedEvmAddresses(user);
  if (evmAddresses.length === 0) return null;

  const matchLists = await Promise.all(
    evmAddresses.map((addr) => getPlayersByEvmWalletCaseInsensitive(addr))
  );

  for (let i = 0; i < evmAddresses.length; i++) {
    const matches = matchLists[i] ?? [];
    const exactStellarMatch = matches.find(
      (player) => player.stellar_wallet_address?.trim() === wantedStellarAddress
    );
    if (exactStellarMatch) return exactStellarMatch;
    const emptyStellarMatch = matches.find(
      (player) => !player.stellar_wallet_address?.trim()
    );
    if (emptyStellarMatch) return emptyStellarMatch;
  }

  return null;
}

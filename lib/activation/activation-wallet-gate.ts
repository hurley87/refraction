import { NextRequest, type NextResponse } from 'next/server';
import {
  getPrivyUserIdFromRequest,
  verifyWalletOwnership,
} from '@/lib/api/privy';
import { apiError, type ApiResponse } from '@/lib/api/response';
import { createOrUpdatePlayer, getPlayerByWallet } from '@/lib/db/players';
import { resolvePlayerForPrivyUser } from '@/lib/privy/resolve-player-for-privy-user';
import type { User } from '@privy-io/server-auth';

/**
 * Ensures the request has a valid Privy Bearer token and the token user matches
 * the wallet owner returned by Privy (same pattern as confirm-purchase).
 */
export async function assertPrivyWalletAuth(
  request: NextRequest,
  walletAddress: string
): Promise<
  { ok: true } | { ok: false; response: NextResponse<ApiResponse<unknown>> }
> {
  const auth = await verifyWalletOwnership(request, walletAddress);
  if (!auth.authorized || !auth.userId) {
    return { ok: false, response: apiError(auth.error ?? 'Unauthorized', 401) };
  }
  const tokenUser = await getPrivyUserIdFromRequest(request);
  if (!tokenUser || tokenUser !== auth.userId) {
    return { ok: false, response: apiError('Unauthorized', 401) };
  }
  return { ok: true };
}

export async function resolvePlayerForWallet(
  normalizedWalletAddress: string,
  privyUser?: User | null
): Promise<{ playerId: number }> {
  const player = privyUser
    ? await resolvePlayerForPrivyUser(normalizedWalletAddress, privyUser)
    : await (async () => {
        let row = await getPlayerByWallet(normalizedWalletAddress);
        if (!row?.id) {
          row = await createOrUpdatePlayer({
            wallet_address: normalizedWalletAddress,
            total_points: 0,
          });
        }
        return row;
      })();
  if (!player?.id) {
    throw new Error('Failed to resolve player for wallet');
  }
  return { playerId: player.id };
}

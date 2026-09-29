import { NextRequest } from 'next/server';
import { resolveServerIdentity, trackSignupFromGate } from '@/lib/analytics';
import { ATTRIBUTION_LIMITS } from '@/lib/analytics/attribution-core';
import { getPrivyUserFromRequest } from '@/lib/api/privy';
import { apiError, apiSuccess } from '@/lib/api/response';
import { captureHandledException } from '@/lib/monitoring/capture-handled-exception';
import { resolvePrivyEvmWalletAddress } from '@/lib/privy/resolve-evm-wallet-address';
import {
  privyLoginEmail,
  resolvePlayerForPrivyUser,
} from '@/lib/privy/resolve-player-for-privy-user';

export const dynamic = 'force-dynamic';

/**
 * Rewards membership gate completion. Upserts `players` from the Privy session
 * (rewards never force username / POST /api/player). When that creates a
 * net-new player and the client sends a reward id, fires `signup_from_gate`.
 */
export async function POST(request: NextRequest) {
  const privyUser = await getPrivyUserFromRequest(request);
  if (!privyUser) {
    return apiError('Unauthorized', 401);
  }

  let rewardId = '';
  try {
    const body: unknown = await request.json();
    const raw =
      body && typeof body === 'object' && 'reward_id' in body
        ? (body as { reward_id?: unknown }).reward_id
        : null;
    if (typeof raw === 'string') {
      rewardId = raw.trim().slice(0, ATTRIBUTION_LIMITS.id);
    }
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  if (!rewardId) {
    return apiError('reward_id is required', 400);
  }

  const evmWallet = resolvePrivyEvmWalletAddress(privyUser as never);
  if (!evmWallet) {
    return apiSuccess({ created: false, reason: 'no_evm_wallet' });
  }

  try {
    const { player, created } = await resolvePlayerForPrivyUser(
      evmWallet,
      privyUser
    );
    if (created) {
      const distinctId = resolveServerIdentity({
        email: player.email ?? privyLoginEmail(privyUser),
        walletAddress: evmWallet,
        playerId: player.id,
      });
      trackSignupFromGate(distinctId, {
        surface: 'reward',
        reward_id: rewardId,
      });
    }
    return apiSuccess({ created, player_id: player.id });
  } catch (error) {
    console.error('Failed to ensure player on reward gate signup:', error);
    captureHandledException(error, {
      route: '/api/rewards/gate-signup',
      operation: 'ensure_player_on_reward_gate',
      statusCode: 500,
    });
    return apiError('Failed to complete reward gate signup', 500);
  }
}

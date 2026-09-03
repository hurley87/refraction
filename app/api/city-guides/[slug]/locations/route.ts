import { NextRequest } from 'next/server';
import { resolveServerIdentity, trackSignupFromGate } from '@/lib/analytics';
import { ATTRIBUTION_LIMITS } from '@/lib/analytics/attribution-core';
import { getPrivyUserFromRequest } from '@/lib/api/privy';
import { apiError, apiSuccess } from '@/lib/api/response';
import { getCityGuidePageData } from '@/lib/db/guides';
import { captureHandledException } from '@/lib/monitoring/capture-handled-exception';
import { resolvePrivyEvmWalletAddress } from '@/lib/privy/resolve-evm-wallet-address';
import {
  privyLoginEmail,
  resolvePlayerForPrivyUser,
} from '@/lib/privy/resolve-player-for-privy-user';

export const dynamic = 'force-dynamic';

type RouteParams = { params: { slug: string } };

function gateAttributionFromRequest(request: NextRequest): {
  fromGate: boolean;
  guideSlug: string | null;
} {
  const { searchParams } = new URL(request.url);
  const fromGate =
    searchParams.get('from_gate') === '1' ||
    searchParams.get('from_gate') === 'true';
  const rawSlug = searchParams.get('guide_slug')?.trim() ?? '';
  const guideSlug = rawSlug ? rawSlug.slice(0, ATTRIBUTION_LIMITS.id) : null;
  return { fromGate, guideSlug };
}

/**
 * City-guide gate unlock. Authenticated readers get the full location list.
 * Also upserts `players` from the Privy session (email + EVM wallet) because
 * guides never force username / POST /api/player. When that upsert creates a
 * net-new player and the client sends gate attribution, fires `signup_from_gate`.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const privyUser = await getPrivyUserFromRequest(request);
  if (!privyUser) {
    return apiError('Unauthorized', 401);
  }

  const { fromGate, guideSlug } = gateAttributionFromRequest(request);
  const evmWallet = resolvePrivyEvmWalletAddress(privyUser as never);
  if (evmWallet) {
    try {
      const { player, created } = await resolvePlayerForPrivyUser(
        evmWallet,
        privyUser
      );
      if (created && fromGate && guideSlug) {
        const distinctId = resolveServerIdentity({
          email: player.email ?? privyLoginEmail(privyUser),
          walletAddress: evmWallet,
          playerId: player.id,
        });
        trackSignupFromGate(distinctId, { guide_slug: guideSlug });
      }
    } catch (error) {
      console.error('Failed to ensure player on city guide unlock:', error);
      captureHandledException(error, {
        route: `/api/city-guides/${params.slug}/locations`,
        operation: 'ensure_player_on_gate_unlock',
        statusCode: 500,
      });
      // Do not block unlocking locations on player sync failure.
    }
  }

  const data = await getCityGuidePageData(params.slug, {
    locationAudience: 'full',
  });
  if (!data) {
    return apiError('City guide not found', 404);
  }

  return apiSuccess({
    locationSections: data.locationSections,
    locationContributorByPlaceId: Object.fromEntries(
      data.locationContributorByPlaceId
    ),
    contributorNames: data.contributorNames,
  });
}

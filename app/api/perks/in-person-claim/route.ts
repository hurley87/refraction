import { NextRequest } from 'next/server';
import { getPerkById } from '@/lib/db/perks';
import { getPlayerByWallet } from '@/lib/db/players';
import {
  countInPersonClaimsToday,
  isClaimedToday,
  recordInPersonClaim,
} from '@/lib/db/perk-in-person-claims';
import { inPersonPerkClaimRequestSchema } from '@/lib/schemas/api';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

function isOnlineClaimPerk(websiteUrl: string | null | undefined): boolean {
  const url = websiteUrl?.trim();
  return Boolean(url);
}

/**
 * GET /api/perks/in-person-claim?perkId=&walletAddress=
 * Status for CLAIMED TODAY UI without recording a claim.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = inPersonPerkClaimRequestSchema.safeParse({
      perkId: searchParams.get('perkId'),
      walletAddress: searchParams.get('walletAddress'),
    });

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { perkId, walletAddress } = parsed.data;
    const player = await getPlayerByWallet(walletAddress);
    if (!player) {
      return apiError('Player not found', 404);
    }

    const perk = await getPerkById(perkId);
    if (!perk) {
      return apiError('Perk not found', 404);
    }

    const canonicalWallet = player.wallet_address ?? walletAddress;
    const claimCountToday = await countInPersonClaimsToday(
      canonicalWallet,
      perkId
    );
    const max = perk.max_claims_per_member_per_day ?? null;

    return apiSuccess({
      perk_id: perkId,
      claim_count_today: claimCountToday,
      max_claims_per_member_per_day: max,
      claimed_today: isClaimedToday(claimCountToday, max),
      is_online: isOnlineClaimPerk(perk.website_url),
    });
  } catch (error) {
    console.error('In-person claim status error:', error);
    return apiError('Failed to get claim status', 500);
  }
}

/**
 * POST /api/perks/in-person-claim
 * Record a show-to-staff claim (server-side daily cap enforcement).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = inPersonPerkClaimRequestSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { perkId, walletAddress } = parsed.data;
    const player = await getPlayerByWallet(walletAddress);
    if (!player) {
      return apiError('Insufficient points', 400);
    }

    const perk = await getPerkById(perkId);
    if (!perk || perk.is_active === false) {
      return apiError('Perk not found', 404);
    }

    if (isOnlineClaimPerk(perk.website_url)) {
      return apiError('This perk must be claimed online', 400);
    }

    const userPoints = player.total_points ?? 0;
    if (userPoints < perk.points_threshold) {
      return apiError('Insufficient points', 400);
    }

    const canonicalWallet = player.wallet_address ?? walletAddress;
    const max = perk.max_claims_per_member_per_day ?? null;
    const claimCountToday = await countInPersonClaimsToday(
      canonicalWallet,
      perkId
    );

    if (isClaimedToday(claimCountToday, max)) {
      return apiError('CLAIMED TODAY', 400);
    }

    const claim = await recordInPersonClaim(canonicalWallet, perkId);
    const claimCountAfter = claimCountToday + 1;

    return apiSuccess({
      claim,
      claim_count_today: claimCountAfter,
      perk: {
        id: perk.id,
        title: perk.title,
        location: perk.location ?? null,
      },
    });
  } catch (error) {
    console.error('In-person claim error:', error);
    return apiError('Failed to record claim', 500);
  }
}

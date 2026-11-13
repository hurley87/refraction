import { NextRequest } from 'next/server';
import { getPrivyUserFromRequest } from '@/lib/api/privy';
import { apiError, apiSuccess, apiValidationError } from '@/lib/api/response';
import { getCountryById } from '@/lib/db/countries';
import { upsertGeoCity } from '@/lib/db/geo-cities';
import {
  getWaitlistMemberPrefill,
  getWaitlistSignupByEmail,
  linkWaitlistSignupToPlayer,
  upsertWaitlistSignup,
} from '@/lib/db/irl-card-waitlist';
import { verifyMapboxCity } from '@/lib/geo/verify-mapbox-city';
import { deliverWaitlistFollowUps } from '@/lib/irl-card/waitlist-delivery';
import { getMetadataBaseForRequest } from '@/lib/metadata/request-base';
import { captureHandledException } from '@/lib/monitoring/capture-handled-exception';
import { resolvePrivyEvmWalletAddress } from '@/lib/privy/resolve-evm-wallet-address';
import {
  findExistingPlayerForPrivyUser,
  privyLoginEmail,
} from '@/lib/privy/resolve-player-for-privy-user';
import { irlCardWaitlistRequestSchema } from '@/lib/schemas/irl-card-waitlist';

export const dynamic = 'force-dynamic';

/** Rapid resubmits of the same email skip follow-up delivery entirely. */
const REPEAT_SUBMIT_WINDOW_MS = 60 * 1000;

async function resolveSignedInMember(
  request: NextRequest
): Promise<{ playerId: number | null; privyUserId: string | null }> {
  const privyUser = await getPrivyUserFromRequest(request);
  if (!privyUser) return { playerId: null, privyUserId: null };

  try {
    const evmWallet = resolvePrivyEvmWalletAddress(privyUser as never) ?? null;
    const player = await findExistingPlayerForPrivyUser(evmWallet, privyUser);
    return { playerId: player?.id ?? null, privyUserId: privyUser.id };
  } catch (error) {
    captureHandledException(error, {
      route: '/api/irl-card/waitlist',
      operation: 'resolve_signed_in_member',
    });
    return { playerId: null, privyUserId: privyUser.id };
  }
}

/**
 * GET /api/irl-card/waitlist (Bearer required)
 * Prefill for signed-in members: verified email, country and saved city,
 * plus whether that email is already on the waitlist.
 */
export async function GET(request: NextRequest) {
  const privyUser = await getPrivyUserFromRequest(request);
  if (!privyUser) {
    return apiError('Unauthorized', 401);
  }

  try {
    const evmWallet = resolvePrivyEvmWalletAddress(privyUser as never) ?? null;
    const player = await findExistingPlayerForPrivyUser(evmWallet, privyUser);
    const prefill = player?.id
      ? await getWaitlistMemberPrefill(player.id)
      : { email: null, countryId: null, city: null };
    const email = prefill.email ?? privyLoginEmail(privyUser) ?? null;
    const existing = email ? await getWaitlistSignupByEmail(email) : null;

    return apiSuccess({
      isMember: Boolean(player?.id),
      email,
      countryId: prefill.countryId,
      city: prefill.city,
      alreadyJoined: Boolean(existing),
    });
  } catch (error) {
    captureHandledException(error, {
      route: '/api/irl-card/waitlist',
      operation: 'load_member_prefill',
      statusCode: 500,
    });
    return apiError('Could not load your details', 500);
  }
}

/**
 * POST /api/irl-card/waitlist
 * Stores one signup per email, linked to the existing player when signed in
 * (never creates a player). Responds success only after the row is stored;
 * welcome email and list sync failures are recorded for the retry cron.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  const parsed = irlCardWaitlistRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }
  const {
    email,
    countryId,
    city,
    alreadyUsesIrl,
    marketingConsent,
    attribution,
  } = parsed.data;

  try {
    const country = await getCountryById(countryId);
    if (!country) {
      return apiError('Unknown country', 400);
    }

    const verified = await verifyMapboxCity({
      mapboxId: city.mapboxId,
      countryIso2: country.iso2,
      name: city.name,
      region: city.region,
    });
    if (!verified.ok) {
      return apiError(verified.error, verified.status);
    }

    const geoCity = await upsertGeoCity({
      countryId: country.id,
      ...verified.city,
    });
    if (geoCity.countryId !== country.id) {
      return apiError('City does not match selected country', 400);
    }

    const member = await resolveSignedInMember(request);

    const { signup, created } = await upsertWaitlistSignup({
      email,
      countryId: country.id,
      geoCityId: geoCity.id,
      countryIso2: country.iso2,
      cityName: geoCity.name,
      alreadyUsesIrl,
      playerId: member.playerId,
      privyUserId: member.privyUserId,
      marketingConsent,
      attribution: attribution && {
        utmSource: attribution.utm_source,
        utmMedium: attribution.utm_medium,
        utmCampaign: attribution.utm_campaign,
        utmTerm: attribution.utm_term,
        utmContent: attribution.utm_content,
        source: attribution.source,
        sourceRef: attribution.source_ref,
        landingPage: attribution.landing_page,
        referrer: attribution.referrer,
      },
    });

    if (!created && member.playerId !== null && signup.playerId === null) {
      try {
        await linkWaitlistSignupToPlayer(
          signup.id,
          member.playerId,
          member.privyUserId
        );
      } catch (error) {
        captureHandledException(error, {
          route: '/api/irl-card/waitlist',
          operation: 'link_waitlist_signup_to_player',
        });
      }
    }

    const isRapidRepeat =
      !created &&
      Date.now() - new Date(signup.createdAt).getTime() <
        REPEAT_SUBMIT_WINDOW_MS;
    if (!isRapidRepeat) {
      const { metadataBase } = getMetadataBaseForRequest(request.headers);
      await deliverWaitlistFollowUps(signup, metadataBase.origin);
    }

    return apiSuccess({
      joined: true,
      alreadyJoined: !created,
      countryIso2: country.iso2,
    });
  } catch (error) {
    captureHandledException(error, {
      route: '/api/irl-card/waitlist',
      operation: 'store_waitlist_signup',
      statusCode: 500,
    });
    return apiError('Could not join the waitlist', 500);
  }
}

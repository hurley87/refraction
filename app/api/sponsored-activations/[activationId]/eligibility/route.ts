import { NextRequest } from 'next/server';
import { assertPrivyWalletAuth } from '@/lib/activation/activation-wallet-gate';
import {
  buildActivationRedemptionIdempotencyKey,
  checkEligibilityEventRateLimits,
  evaluateEligibilityBusinessRules,
  userHasBlockingRedemptionForRewardItem,
} from '@/lib/activation/eligibility';
import { canActivationAcceptUserRedemptionFlow } from '@/lib/activation/lifecycle';
import { trackSponsoredActivationEligibilityRecorded } from '@/lib/analytics/server';
import { emitSponsoredAnalyticsForWalletRequest } from '@/lib/analytics/sponsored-wallet-request-tracking';
import { apiError, apiSuccess, apiValidationError } from '@/lib/api/response';
import {
  countEligibilityEventsForUserActivation,
  countEligibilityEventsForUserActivationInUtcWindow,
  findEligibilityEventByLogicalKey,
  insertActivationEligibilityEvent,
  listEligibilityEventsForUserActivation,
} from '@/lib/db/activation-eligibility-events';
import {
  insertActivationRedemption,
  listRedemptionsForEligibilityEvent,
  listRedemptionsForUserActivation,
  type ActivationRedemptionRow,
} from '@/lib/db/activation-redemptions';
import { listActivationRewardItems } from '@/lib/db/activation-reward-items';
import { createOrUpdatePlayer, getPlayerByWallet } from '@/lib/db/players';
import { getSponsoredActivationByIdOrSlug } from '@/lib/db/sponsored-activations';
import { getTiers } from '@/lib/db/tiers';
import { safeParseActivationEligibilityRulesConfig } from '@/lib/schemas/activation-eligibility-config';
import {
  recordSponsoredActivationEligibilityBodySchema,
  type ActivationEligibilitySource,
} from '@/lib/schemas/activation-eligibility';
import { getUtcDayBounds } from '@/lib/utils/date';
import { tryNormalizeEvmAddress } from '@/lib/utils/wallets';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type RouteParams = { params: { activationId: string } };

const eligibilityWalletQuerySchema = z
  .string()
  .min(1, 'walletAddress is required')
  .refine((s) => /^0x[a-fA-F0-9]{40}$/.test(s.trim()), {
    message: 'walletAddress must be a valid EVM address',
  });

const ELIGIBILITY_RULES_NOT_MET = 'Eligibility requirements were not met';

async function resolvePlayerForEligibility(walletAddress: string): Promise<{
  playerId: number;
  totalPoints: number;
}> {
  const trimmed = walletAddress.trim();
  const normalized = tryNormalizeEvmAddress(trimmed) ?? trimmed;
  let player = await getPlayerByWallet(normalized);
  if (!player?.id) {
    player = await createOrUpdatePlayer({
      wallet_address: normalized,
      total_points: 0,
    });
  }
  if (!player?.id) {
    throw new Error('Failed to resolve player for wallet');
  }
  return {
    playerId: player.id,
    totalPoints: player.total_points ?? 0,
  };
}

/**
 * POST /api/sponsored-activations/{activationIdOrSlug}/eligibility
 * GET /api/sponsored-activations/{activationIdOrSlug}/eligibility?walletAddress=0x…
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const activationKey = params.activationId?.trim();
  if (!activationKey) {
    return apiError('Missing activation id or slug', 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  const parsed = recordSponsoredActivationEligibilityBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const { walletAddress, source, source_ref_id, metadata } = parsed.data;

  const gate = await assertPrivyWalletAuth(request, walletAddress);
  if (!gate.ok) return gate.response;

  const activation = await getSponsoredActivationByIdOrSlug(activationKey);
  if (!activation) {
    return apiError('Sponsored activation not found', 404);
  }

  const configParse = safeParseActivationEligibilityRulesConfig(
    activation.eligibility_config
  );
  if (!configParse.success) {
    return apiError('Activation eligibility configuration is invalid', 400);
  }
  const config = configParse.data;

  if (
    !canActivationAcceptUserRedemptionFlow({
      status: activation.status,
      starts_at: activation.starts_at,
      ends_at: activation.ends_at,
    })
  ) {
    return apiError('Activation is not accepting eligibility right now', 400);
  }

  let playerId: number;
  let totalPoints: number;
  try {
    const resolved = await resolvePlayerForEligibility(walletAddress);
    playerId = resolved.playerId;
    totalPoints = resolved.totalPoints;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to resolve player';
    console.error('POST sponsored activation eligibility (player):', e);
    return apiError(msg, 500);
  }

  const dbSource = source as ActivationEligibilitySource;

  const existingEvent = await findEligibilityEventByLogicalKey({
    activationId: activation.id,
    userId: playerId,
    source: dbSource,
    sourceRefId: source_ref_id,
  });

  if (existingEvent) {
    const redemptions = await listRedemptionsForEligibilityEvent(
      existingEvent.id
    );
    const eligible = redemptions.some((r) => r.status === 'available');
    return apiSuccess({
      eligibilityEvent: existingEvent,
      redemptions,
      eligible,
    });
  }

  const tiers = await getTiers();

  const rules = evaluateEligibilityBusinessRules({
    config,
    source,
    sourceRefId: source_ref_id,
    tiersSortedAsc: tiers,
    playerTotalPoints: totalPoints,
  });
  if (!rules.ok) {
    return apiError(ELIGIBILITY_RULES_NOT_MET, 400);
  }

  const { startIso, endIso } = getUtcDayBounds();
  let lifetimeCount: number;
  let dailyCount: number;
  try {
    lifetimeCount = await countEligibilityEventsForUserActivation({
      activationId: activation.id,
      userId: playerId,
    });
    dailyCount = await countEligibilityEventsForUserActivationInUtcWindow({
      activationId: activation.id,
      userId: playerId,
      occurredAtGte: startIso,
      occurredAtLt: endIso,
    });
  } catch (e) {
    console.error('POST sponsored activation eligibility (counts):', e);
    return apiError('Failed to evaluate eligibility limits', 500);
  }

  const rate = checkEligibilityEventRateLimits({
    config,
    lifetimeCountBeforeInsert: lifetimeCount,
    dailyCountBeforeInsert: dailyCount,
  });
  if (rate === 'daily_exceeded') {
    return apiError('Too many eligibility requests today', 429);
  }
  if (rate === 'lifetime_exceeded') {
    return apiError('Eligibility limit reached for this activation', 400);
  }

  const occurredAt = new Date().toISOString();
  const walletStored =
    tryNormalizeEvmAddress(walletAddress.trim()) ?? walletAddress.trim();

  let eligibilityEvent;
  try {
    eligibilityEvent = await insertActivationEligibilityEvent({
      activation_id: activation.id,
      user_id: playerId,
      wallet_address: walletStored,
      source: dbSource,
      source_ref_id: source_ref_id,
      occurred_at: occurredAt,
      metadata: metadata ?? {},
    });
  } catch (e) {
    console.error('POST sponsored activation eligibility (insert event):', e);
    return apiError('Failed to record eligibility', 500);
  }

  await emitSponsoredAnalyticsForWalletRequest(
    request,
    walletStored,
    playerId,
    (distinctId) =>
      trackSponsoredActivationEligibilityRecorded(distinctId, {
        activation_id: activation.id,
        settlement_rail: activation.settlement_rail,
        user_id: playerId,
      })
  );

  const rewardItems = await listActivationRewardItems(activation.id);
  const activeItems = rewardItems.filter((i) => i.is_active);
  const existingRedemptions = await listRedemptionsForUserActivation({
    activationId: activation.id,
    userId: playerId,
  });

  const redemptions: ActivationRedemptionRow[] = [];
  for (const item of activeItems) {
    if (userHasBlockingRedemptionForRewardItem(existingRedemptions, item.id)) {
      continue;
    }
    const idempotencyKey = buildActivationRedemptionIdempotencyKey({
      activationId: activation.id,
      playerId,
      rewardItemId: item.id,
    });
    try {
      const row = await insertActivationRedemption({
        activation_id: activation.id,
        reward_item_id: item.id,
        user_id: playerId,
        eligibility_event_id: eligibilityEvent.id,
        status: 'available',
        idempotency_key: idempotencyKey,
      });
      redemptions.push(row);
      existingRedemptions.push(row);
    } catch (e) {
      console.error('POST sponsored activation eligibility (redemption):', e);
    }
  }

  const eligible = redemptions.some((r) => r.status === 'available');

  return apiSuccess({
    eligibilityEvent,
    redemptions,
    eligible,
  });
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const activationKey = params.activationId?.trim();
  if (!activationKey) {
    return apiError('Missing activation id or slug', 400);
  }

  const walletRaw = request.nextUrl.searchParams.get('walletAddress');
  const walletParsed = eligibilityWalletQuerySchema.safeParse(walletRaw ?? '');
  if (!walletParsed.success) {
    return apiValidationError(walletParsed.error);
  }
  const walletAddress = walletParsed.data;

  const gate = await assertPrivyWalletAuth(request, walletAddress);
  if (!gate.ok) return gate.response;

  const activation = await getSponsoredActivationByIdOrSlug(activationKey);
  if (!activation) {
    return apiError('Sponsored activation not found', 404);
  }

  let playerId: number;
  try {
    const resolved = await resolvePlayerForEligibility(walletAddress);
    playerId = resolved.playerId;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to resolve player';
    console.error('GET sponsored activation eligibility (player):', e);
    return apiError(msg, 500);
  }

  const eligibilityEvents = await listEligibilityEventsForUserActivation({
    activationId: activation.id,
    userId: playerId,
  });
  const redemptions = await listRedemptionsForUserActivation({
    activationId: activation.id,
    userId: playerId,
  });

  return apiSuccess({
    activationId: activation.id,
    eligibilityEvents,
    redemptions,
  });
}

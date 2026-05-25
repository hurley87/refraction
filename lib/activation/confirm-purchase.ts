import { NextRequest, type NextResponse } from 'next/server';
import {
  getPrivyUserIdFromRequest,
  verifyWalletOwnership,
} from '@/lib/api/privy';
import {
  apiError,
  apiValidationError,
  type ApiResponse,
} from '@/lib/api/response';
import {
  buildActivationRedemptionIdempotencyKey,
  checkEligibilityEventRateLimits,
} from '@/lib/activation/eligibility';
import { canActivationAcceptUserRedemptionFlow } from '@/lib/activation/lifecycle';
import {
  confirmActivationPurchaseAtomic,
  countActivationPurchaseConfirmsForUserActivation,
  countActivationPurchaseConfirmsForUserActivationInUtcWindow,
  getActivationRedemptionById,
  type ActivationRedemptionRow,
} from '@/lib/db/activation-redemptions';
import { getActivationRewardItemById } from '@/lib/db/activation-reward-items';
import { createOrUpdatePlayer, getPlayerByWallet } from '@/lib/db/players';
import { getSponsoredActivationByIdOrSlug } from '@/lib/db/sponsored-activations';
import { safeParseActivationEligibilityRulesConfig } from '@/lib/schemas/activation-eligibility-config';
import { activationConfirmPurchaseBodySchema } from '@/lib/schemas/activation-confirm-purchase';
import { getUtcDayBounds } from '@/lib/utils/date';
import { tryNormalizeEvmAddress } from '@/lib/utils/wallets';

export type ConfirmPurchaseSuccessBody = {
  redemption: ActivationRedemptionRow;
  player: { total_points: number };
};

async function assertPrivyWalletAuth(
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

async function resolvePlayerForWallet(
  walletAddress: string
): Promise<{ playerId: number }> {
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
  return { playerId: player.id };
}

function mapRpcOrUnexpectedError(message: string): {
  status: 400 | 404 | 500;
  error: string;
} {
  if (message.includes('ACTIVATION_PURCHASE_INSUFFICIENT_POINTS')) {
    return {
      status: 400,
      error: 'You do not have enough points for this reward',
    };
  }
  if (
    message.includes('ACTIVATION_PURCHASE_CAP_EXCEEDED') ||
    message.includes('ACTIVATION_PURCHASE_MAX_PER_USER') ||
    message.includes('ACTIVATION_PURCHASE_REWARD_INACTIVE')
  ) {
    return { status: 400, error: 'This reward is no longer available' };
  }
  if (message.includes('ACTIVATION_PURCHASE_INVALID_STATUS')) {
    return { status: 400, error: 'Unable to confirm this purchase' };
  }
  if (
    message.includes('ACTIVATION_PURCHASE_NOT_FOUND') ||
    message.includes('ACTIVATION_PURCHASE_ACTIVATION_NOT_FOUND') ||
    message.includes('ACTIVATION_PURCHASE_REWARD_ITEM_MISMATCH')
  ) {
    return { status: 404, error: 'Unable to confirm this purchase' };
  }
  if (
    message.includes('ACTIVATION_PURCHASE_PLAYER_MISMATCH') ||
    message.includes('ACTIVATION_PURCHASE_PLAYER_NOT_FOUND')
  ) {
    return { status: 400, error: 'Unable to confirm this purchase' };
  }
  return { status: 500, error: 'Something went wrong' };
}

/**
 * POST handler body for sponsored activation confirm purchase (IRL-54).
 */
export async function runConfirmActivationPurchase(input: {
  request: NextRequest;
  activationKey: string;
  body: unknown;
}): Promise<
  | {
      ok: true;
      body: ConfirmPurchaseSuccessBody;
    }
  | { ok: false; response: NextResponse<ApiResponse<unknown>> }
> {
  const activationSegment = input.activationKey.trim();
  if (!activationSegment) {
    return {
      ok: false,
      response: apiError('Missing activation id or slug', 400),
    };
  }

  const parsed = activationConfirmPurchaseBodySchema.safeParse(input.body);
  if (!parsed.success) {
    return { ok: false, response: apiValidationError(parsed.error) };
  }

  const { walletAddress, redemptionId } = parsed.data;

  const gate = await assertPrivyWalletAuth(input.request, walletAddress);
  if (!gate.ok) return { ok: false, response: gate.response };

  const activation = await getSponsoredActivationByIdOrSlug(activationSegment);
  if (!activation) {
    return {
      ok: false,
      response: apiError('Sponsored activation not found', 404),
    };
  }

  const configParse = safeParseActivationEligibilityRulesConfig(
    activation.eligibility_config
  );
  if (!configParse.success) {
    return {
      ok: false,
      response: apiError(
        'Activation eligibility configuration is invalid',
        400
      ),
    };
  }
  const rulesConfig = configParse.data;

  if (
    !canActivationAcceptUserRedemptionFlow({
      status: activation.status,
      starts_at: activation.starts_at,
      ends_at: activation.ends_at,
    })
  ) {
    return {
      ok: false,
      response: apiError(
        'Activation is not accepting redemptions right now',
        400
      ),
    };
  }

  let playerId: number;
  try {
    const resolved = await resolvePlayerForWallet(walletAddress);
    playerId = resolved.playerId;
  } catch (e) {
    console.error('confirm purchase (resolve player):', e);
    return {
      ok: false,
      response: apiError('Something went wrong', 500),
    };
  }

  const redemption = await getActivationRedemptionById(redemptionId);
  if (!redemption || redemption.activation_id !== activation.id) {
    return {
      ok: false,
      response: apiError('Unable to confirm this purchase', 404),
    };
  }
  if (redemption.user_id !== playerId) {
    return {
      ok: false,
      response: apiError('Unable to confirm this purchase', 404),
    };
  }

  const expectedKey = buildActivationRedemptionIdempotencyKey({
    activationId: activation.id,
    playerId,
    rewardItemId: redemption.reward_item_id,
  });
  if (redemption.idempotency_key !== expectedKey) {
    return {
      ok: false,
      response: apiError('Unable to confirm this purchase', 400),
    };
  }

  const rewardItem = await getActivationRewardItemById(
    activation.id,
    redemption.reward_item_id
  );
  if (!rewardItem) {
    return {
      ok: false,
      response: apiError('Unable to confirm this purchase', 404),
    };
  }
  if (!rewardItem.is_active) {
    return {
      ok: false,
      response: apiError('This reward is no longer available', 400),
    };
  }

  const walletForRpc =
    tryNormalizeEvmAddress(walletAddress.trim()) ?? walletAddress.trim();

  if (redemption.status === 'available') {
    let lifetimeCount: number;
    let dailyCount: number;
    try {
      lifetimeCount = await countActivationPurchaseConfirmsForUserActivation({
        activationId: activation.id,
        userId: playerId,
      });
      const { startIso, endIso } = getUtcDayBounds();
      dailyCount =
        await countActivationPurchaseConfirmsForUserActivationInUtcWindow({
          activationId: activation.id,
          userId: playerId,
          purchaseConfirmedAtGte: startIso,
          purchaseConfirmedAtLt: endIso,
        });
    } catch (e) {
      console.error('confirm purchase (rate limit counts):', e);
      return {
        ok: false,
        response: apiError('Something went wrong', 500),
      };
    }

    const rate = checkEligibilityEventRateLimits({
      config: rulesConfig,
      lifetimeCountBeforeInsert: lifetimeCount,
      dailyCountBeforeInsert: dailyCount,
    });
    if (rate === 'daily_exceeded') {
      return {
        ok: false,
        response: apiError('Too many eligibility requests today', 429),
      };
    }
    if (rate === 'lifetime_exceeded') {
      return {
        ok: false,
        response: apiError(
          'Eligibility limit reached for this activation',
          400
        ),
      };
    }
  }

  let rpc: { outcome: string; playerTotalPoints: number };
  try {
    rpc = await confirmActivationPurchaseAtomic({
      redemptionId,
      playerId,
      walletAddress: walletForRpc,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    const mapped = mapRpcOrUnexpectedError(msg);
    return {
      ok: false,
      response: apiError(mapped.error, mapped.status),
    };
  }

  let fresh: ActivationRedemptionRow | null;
  try {
    fresh = await getActivationRedemptionById(redemptionId);
  } catch (e) {
    console.error('confirm purchase (reload redemption):', e);
    return {
      ok: false,
      response: apiError('Something went wrong', 500),
    };
  }
  if (!fresh) {
    return {
      ok: false,
      response: apiError('Something went wrong', 500),
    };
  }

  return {
    ok: true,
    body: {
      redemption: fresh,
      player: { total_points: rpc.playerTotalPoints },
    },
  };
}

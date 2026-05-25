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
import { buildActivationRedemptionIdempotencyKey } from '@/lib/activation/eligibility';
import { canActivationAcceptUserRedemptionFlow } from '@/lib/activation/lifecycle';
import {
  confirmActivationPurchaseAtomic,
  getActivationRedemptionById,
  type ActivationRedemptionRow,
  type ConfirmActivationPurchaseRpcResult,
} from '@/lib/db/activation-redemptions';
import { getActivationRewardItemById } from '@/lib/db/activation-reward-items';
import { createOrUpdatePlayer, getPlayerByWallet } from '@/lib/db/players';
import { getSponsoredActivationByIdOrSlug } from '@/lib/db/sponsored-activations';
import { safeParseActivationEligibilityRulesConfig } from '@/lib/schemas/activation-eligibility-config';
import { activationConfirmPurchaseBodySchema } from '@/lib/schemas/activation-confirm-purchase';
import type { ActivationRedemptionStatus } from '@/lib/schemas/activation-redemption';
import { tryNormalizeEvmAddress } from '@/lib/utils/wallets';

export type ConfirmPurchaseSuccessBody = {
  redemption: ActivationRedemptionRow;
  player: { total_points: number };
};

/** Matches `confirm_activation_purchase_atomic` idempotent early-return statuses. */
const PURCHASE_CONFIRM_IDEMPOTENT_STATUSES =
  new Set<ActivationRedemptionStatus>([
    'ready_to_redeem',
    'redeemed',
    'settlement_pending',
    'settlement_confirmed',
    'settlement_failed',
    'purchase_confirmed',
  ]);

function isActivationPurchaseConfirmIdempotentReplay(
  status: ActivationRedemptionStatus
): boolean {
  return PURCHASE_CONFIRM_IDEMPOTENT_STATUSES.has(status);
}

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
  normalizedWalletAddress: string
): Promise<{ playerId: number }> {
  let player = await getPlayerByWallet(normalizedWalletAddress);
  if (!player?.id) {
    player = await createOrUpdatePlayer({
      wallet_address: normalizedWalletAddress,
      total_points: 0,
    });
  }
  if (!player?.id) {
    throw new Error('Failed to resolve player for wallet');
  }
  return { playerId: player.id };
}

function mapRpcOrUnexpectedError(message: string): {
  status: 400 | 404 | 429 | 500;
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
  if (message.includes('ACTIVATION_PURCHASE_DAILY_USER_LIMIT_EXCEEDED')) {
    return {
      status: 429,
      error: 'Too many eligibility requests today',
    };
  }
  if (message.includes('ACTIVATION_PURCHASE_LIFETIME_USER_LIMIT_EXCEEDED')) {
    return {
      status: 400,
      error: 'Eligibility limit reached for this activation',
    };
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
  const walletKey =
    tryNormalizeEvmAddress(walletAddress.trim()) ?? walletAddress.trim();

  const gate = await assertPrivyWalletAuth(input.request, walletKey);
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

  let playerId: number;
  try {
    const resolved = await resolvePlayerForWallet(walletKey);
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

  if (!isActivationPurchaseConfirmIdempotentReplay(redemption.status)) {
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
  }

  let rpc: ConfirmActivationPurchaseRpcResult;
  try {
    rpc = await confirmActivationPurchaseAtomic({
      redemptionId,
      playerId,
      walletAddress: walletKey,
      maxPurchaseConfirmsPerUser: rulesConfig.max_events_per_user,
      maxPurchaseConfirmsPerUserPerDay: rulesConfig.max_events_per_user_per_day,
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

import { NextRequest, type NextResponse } from 'next/server';
import {
  assertPrivyWalletAuth,
  resolvePlayerForWallet,
} from '@/lib/activation/activation-wallet-gate';
import { buildActivationRedemptionIdempotencyKey } from '@/lib/activation/eligibility';
import {
  apiError,
  apiValidationError,
  type ApiResponse,
} from '@/lib/api/response';
import {
  getActivationRedemptionById,
  swipeActivationRedeemAtomic,
  type ActivationRedemptionRow,
  type SwipeActivationRedeemRpcResult,
} from '@/lib/db/activation-redemptions';
import {
  getActivationSettlementTransactionByRedemptionId,
  type ActivationSettlementTransactionRow,
} from '@/lib/db/activation-settlement-transactions';
import { getSponsoredActivationByIdOrSlug } from '@/lib/db/sponsored-activations';
import { safeParseActivationEligibilityRulesConfig } from '@/lib/schemas/activation-eligibility-config';
import { activationSwipeRedeemBodySchema } from '@/lib/schemas/activation-swipe-redeem';
import { tryNormalizeEvmAddress } from '@/lib/utils/wallets';

export type SwipeRedeemSuccessBody = {
  redemption: ActivationRedemptionRow;
  settlement: ActivationSettlementTransactionRow;
};

function mapSwipeRpcOrUnexpectedError(message: string): {
  status: 400 | 404 | 429 | 500;
  error: string;
} {
  if (
    message.includes('ACTIVATION_SWIPE_BUDGET_EXCEEDED') ||
    message.includes('ACTIVATION_SWIPE_MAX_PER_USER')
  ) {
    return { status: 400, error: 'This reward is no longer available' };
  }
  if (message.includes('ACTIVATION_SWIPE_DAILY_USER_LIMIT_EXCEEDED')) {
    return {
      status: 429,
      error: 'Too many eligibility requests today',
    };
  }
  if (message.includes('ACTIVATION_SWIPE_LIFETIME_USER_LIMIT_EXCEEDED')) {
    return {
      status: 400,
      error: 'Eligibility limit reached for this activation',
    };
  }
  if (message.includes('ACTIVATION_SWIPE_INVALID_STATUS')) {
    return { status: 400, error: 'Unable to complete this redemption' };
  }
  if (message.includes('ACTIVATION_SWIPE_NOT_LIVE')) {
    return {
      status: 400,
      error: 'Activation is not accepting redemptions right now',
    };
  }
  if (
    message.includes('ACTIVATION_SWIPE_NOT_FOUND') ||
    message.includes('ACTIVATION_SWIPE_ACTIVATION_NOT_FOUND') ||
    message.includes('ACTIVATION_SWIPE_REWARD_ITEM_MISMATCH')
  ) {
    return { status: 404, error: 'Unable to complete this redemption' };
  }
  if (
    message.includes('ACTIVATION_SWIPE_PLAYER_MISMATCH') ||
    message.includes('ACTIVATION_SWIPE_PLAYER_WALLET_MISMATCH')
  ) {
    return { status: 400, error: 'Unable to complete this redemption' };
  }
  return { status: 500, error: 'Something went wrong' };
}

export async function runSwipeActivationRedeem(input: {
  request: NextRequest;
  activationKey: string;
  body: unknown;
}): Promise<
  | { ok: true; body: SwipeRedeemSuccessBody }
  | { ok: false; response: NextResponse<ApiResponse<unknown>> }
> {
  const activationSegment = input.activationKey.trim();
  if (!activationSegment) {
    return {
      ok: false,
      response: apiError('Missing activation id or slug', 400),
    };
  }

  const parsed = activationSwipeRedeemBodySchema.safeParse(input.body);
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
    console.error('swipe redeem (resolve player):', e);
    return {
      ok: false,
      response: apiError('Something went wrong', 500),
    };
  }

  const redemption = await getActivationRedemptionById(redemptionId);
  if (!redemption || redemption.activation_id !== activation.id) {
    return {
      ok: false,
      response: apiError('Unable to complete this redemption', 404),
    };
  }
  if (redemption.user_id !== playerId) {
    return {
      ok: false,
      response: apiError('Unable to complete this redemption', 404),
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
      response: apiError('Unable to complete this redemption', 400),
    };
  }

  let rpc: SwipeActivationRedeemRpcResult;
  try {
    rpc = await swipeActivationRedeemAtomic({
      redemptionId,
      playerId,
      walletAddress: walletKey,
      maxSwipeRedeemsPerUser: rulesConfig.max_events_per_user,
      maxSwipeRedeemsPerUserPerDay: rulesConfig.max_events_per_user_per_day,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    const mapped = mapSwipeRpcOrUnexpectedError(msg);
    return {
      ok: false,
      response: apiError(mapped.error, mapped.status),
    };
  }

  let freshRedemption: ActivationRedemptionRow | null;
  try {
    freshRedemption = await getActivationRedemptionById(redemptionId);
  } catch (err) {
    console.error('swipe redeem (reload redemption after RPC):', err);
    return {
      ok: false,
      response: apiError('Something went wrong', 500),
    };
  }
  if (!freshRedemption) {
    return {
      ok: false,
      response: apiError('Something went wrong', 500),
    };
  }

  if (rpc.outcome === 'expired') {
    return {
      ok: false,
      response: apiError('This redemption is no longer valid', 400, {
        redemption: freshRedemption,
      }),
    };
  }

  let settlement: ActivationSettlementTransactionRow | null;
  try {
    settlement =
      await getActivationSettlementTransactionByRedemptionId(redemptionId);
  } catch (e) {
    console.error('swipe redeem (load settlement):', e);
    return {
      ok: false,
      response: apiError('Something went wrong', 500),
    };
  }
  if (!settlement) {
    console.error(
      'swipe redeem: settlement row missing after successful swipe RPC',
      { redemptionId }
    );
    return {
      ok: false,
      response: apiError('Something went wrong', 500),
    };
  }

  return {
    ok: true,
    body: { redemption: freshRedemption, settlement },
  };
}

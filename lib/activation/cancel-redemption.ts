import { NextRequest, type NextResponse } from 'next/server';
import {
  assertPrivyWalletAuth,
  resolvePlayerForWallet,
} from '@/lib/activation/activation-wallet-gate';
import { getPrivyUserFromRequest } from '@/lib/api/privy';
import { buildActivationRedemptionIdempotencyKey } from '@/lib/activation/eligibility';
import { trackSponsoredRedemptionCancelled } from '@/lib/analytics/server';
import { emitSponsoredAnalyticsForWalletRequest } from '@/lib/analytics/sponsored-wallet-request-tracking';
import {
  apiError,
  apiValidationError,
  type ApiResponse,
} from '@/lib/api/response';
import {
  cancelActivationRedemptionAtomic,
  getActivationRedemptionById,
  type ActivationRedemptionRow,
  type CancelActivationRedemptionRpcResult,
} from '@/lib/db/activation-redemptions';
import { getSponsoredActivationByIdOrSlug } from '@/lib/db/sponsored-activations';
import { activationCancelRedemptionBodySchema } from '@/lib/schemas/activation-cancel-redemption';
import { tryNormalizeEvmAddress } from '@/lib/utils/wallets';

export type CancelRedemptionSuccessBody = {
  redemption: ActivationRedemptionRow;
};

function mapCancelRpcOrUnexpectedError(message: string): {
  status: 400 | 404 | 500;
  error: string;
} {
  if (message.includes('ACTIVATION_CANCEL_INVALID_STATUS')) {
    return { status: 400, error: 'Unable to cancel this redemption' };
  }
  if (
    message.includes('ACTIVATION_CANCEL_NOT_FOUND') ||
    message.includes('ACTIVATION_CANCEL_PLAYER_MISMATCH')
  ) {
    return { status: 404, error: 'Unable to cancel this redemption' };
  }
  if (message.includes('ACTIVATION_CANCEL_PLAYER_WALLET_MISMATCH')) {
    return { status: 400, error: 'Unable to cancel this redemption' };
  }
  return { status: 500, error: 'Something went wrong' };
}

export async function runCancelActivationRedemption(input: {
  request: NextRequest;
  activationKey: string;
  body: unknown;
}): Promise<
  | { ok: true; body: CancelRedemptionSuccessBody }
  | { ok: false; response: NextResponse<ApiResponse<unknown>> }
> {
  const activationSegment = input.activationKey.trim();
  if (!activationSegment) {
    return {
      ok: false,
      response: apiError('Missing activation id or slug', 400),
    };
  }

  const parsed = activationCancelRedemptionBodySchema.safeParse(input.body);
  if (!parsed.success) {
    return { ok: false, response: apiValidationError(parsed.error) };
  }

  const { walletAddress, redemptionId, reason } = parsed.data;
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

  const privyUser = await getPrivyUserFromRequest(input.request);

  let playerId: number;
  try {
    const resolved = await resolvePlayerForWallet(walletKey, privyUser);
    playerId = resolved.playerId;
  } catch (e) {
    console.error('cancel redemption (resolve player):', e);
    return {
      ok: false,
      response: apiError('Something went wrong', 500),
    };
  }

  const redemption = await getActivationRedemptionById(redemptionId);
  if (!redemption || redemption.activation_id !== activation.id) {
    return {
      ok: false,
      response: apiError('Unable to cancel this redemption', 404),
    };
  }
  if (redemption.user_id !== playerId) {
    return {
      ok: false,
      response: apiError('Unable to cancel this redemption', 404),
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
      response: apiError('Unable to cancel this redemption', 400),
    };
  }

  let cancelRpc: CancelActivationRedemptionRpcResult;
  try {
    cancelRpc = await cancelActivationRedemptionAtomic({
      redemptionId,
      playerId,
      walletAddress: walletKey,
      reason: reason ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    const mapped = mapCancelRpcOrUnexpectedError(msg);
    return {
      ok: false,
      response: apiError(mapped.error, mapped.status),
    };
  }

  if (cancelRpc.outcome === 'cancelled') {
    await emitSponsoredAnalyticsForWalletRequest(
      input.request,
      walletKey,
      playerId,
      (distinctId) =>
        trackSponsoredRedemptionCancelled(distinctId, {
          activation_id: activation.id,
          settlement_rail: activation.settlement_rail,
          user_id: playerId,
          reward_item_id: redemption.reward_item_id,
          redemption_id: redemptionId,
        })
    );
  }

  let fresh: ActivationRedemptionRow | null;
  try {
    fresh = await getActivationRedemptionById(redemptionId);
  } catch (e) {
    console.error('cancel redemption (reload redemption):', e);
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

  return { ok: true, body: { redemption: fresh } };
}

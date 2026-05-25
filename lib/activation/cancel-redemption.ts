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
import {
  cancelActivationRedemptionAtomic,
  getActivationRedemptionById,
  type ActivationRedemptionRow,
} from '@/lib/db/activation-redemptions';
import { createOrUpdatePlayer, getPlayerByWallet } from '@/lib/db/players';
import { getSponsoredActivationByIdOrSlug } from '@/lib/db/sponsored-activations';
import { activationCancelRedemptionBodySchema } from '@/lib/schemas/activation-cancel-redemption';
import { tryNormalizeEvmAddress } from '@/lib/utils/wallets';

export type CancelRedemptionSuccessBody = {
  redemption: ActivationRedemptionRow;
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

  let playerId: number;
  try {
    const resolved = await resolvePlayerForWallet(walletKey);
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

  try {
    await cancelActivationRedemptionAtomic({
      redemptionId,
      playerId,
      walletAddress: walletKey,
      reason: reason?.trim() ? reason.trim() : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    const mapped = mapCancelRpcOrUnexpectedError(msg);
    return {
      ok: false,
      response: apiError(mapped.error, mapped.status),
    };
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

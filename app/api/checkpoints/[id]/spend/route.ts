import { NextRequest } from 'next/server';
import { apiError, apiSuccess, apiValidationError } from '@/lib/api/response';
import { walletAddressSchema } from '@/lib/schemas/player';
import { verifyWalletOwnership } from '@/lib/api/privy';
import { getActiveCheckpointById } from '@/lib/db/checkpoints';
import {
  getSpendItemByCheckpointId,
  getUserRedemptionForSpendItem,
  redeemSpendItemOnce,
} from '@/lib/db/spend';
import { z } from 'zod';

const redeemSpendCheckpointSchema = z.object({
  walletAddress: walletAddressSchema,
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const checkpoint = await getActiveCheckpointById(params.id);
    if (!checkpoint || checkpoint.checkpoint_mode !== 'spend') {
      return apiError('Spend checkpoint not found', 404);
    }

    const spendItem = await getSpendItemByCheckpointId(params.id);
    if (!spendItem || !spendItem.is_active) {
      return apiError('Spend item unavailable', 404);
    }

    const walletAddress = new URL(request.url).searchParams.get('walletAddress');
    if (!walletAddress) {
      return apiSuccess({ checkpoint, spendItem, redemption: null });
    }

    const walletResult = walletAddressSchema.safeParse(walletAddress);
    if (!walletResult.success) {
      return apiValidationError(walletResult.error);
    }

    const auth = await verifyWalletOwnership(request, walletResult.data);
    if (!auth.authorized) {
      return apiError(auth.error ?? 'Unauthorized', 401);
    }

    const redemption = await getUserRedemptionForSpendItem(
      spendItem.id!,
      walletResult.data
    );

    return apiSuccess({ checkpoint, spendItem, redemption });
  } catch (error) {
    console.error('Error fetching spend checkpoint:', error);
    return apiError('Failed to fetch spend checkpoint', 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const checkpoint = await getActiveCheckpointById(params.id);
    if (!checkpoint || checkpoint.checkpoint_mode !== 'spend') {
      return apiError('Spend checkpoint not found', 404);
    }

    const spendItem = await getSpendItemByCheckpointId(params.id);
    if (!spendItem || !spendItem.is_active) {
      return apiError('Spend item unavailable', 404);
    }

    const body = await request.json();
    const validationResult = redeemSpendCheckpointSchema.safeParse(body);
    if (!validationResult.success) {
      return apiValidationError(validationResult.error);
    }

    const auth = await verifyWalletOwnership(
      request,
      validationResult.data.walletAddress
    );
    if (!auth.authorized) {
      return apiError(auth.error ?? 'Unauthorized', 401);
    }

    const result = await redeemSpendItemOnce(
      spendItem.id!,
      validationResult.data.walletAddress
    );

    return apiSuccess(
      {
        checkpoint,
        spendItem,
        redemption: result.redemption,
        player: result.player,
      },
      'Redeemed successfully.'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to redeem';
    console.error('Error redeeming spend checkpoint:', error);
    if (
      message === 'You already redeemed this item' ||
      message === 'Insufficient points' ||
      message === 'Player not found' ||
      message === 'This item is no longer available'
    ) {
      return apiError(message, 400);
    }
    return apiError('Failed to redeem', 500);
  }
}

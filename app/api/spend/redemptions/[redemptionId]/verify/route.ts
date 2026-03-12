import { NextRequest } from 'next/server';
import { verifySpendRedemption } from '@/lib/db/spend';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { verifyRedemptionSchema } from '@/lib/schemas/spend';
import { verifyWalletOwnership } from '@/lib/api/privy';
import { ZodError } from 'zod';

/**
 * POST /api/spend/redemptions/[redemptionId]/verify
 * User verifies a pending redemption: deducts points and marks fulfilled.
 * Body: { walletAddress }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { redemptionId: string } }
) {
  try {
    const body = await request.json();
    const validated = verifyRedemptionSchema.parse(body);

    const auth = await verifyWalletOwnership(request, validated.walletAddress);
    if (!auth.authorized) {
      return apiError(auth.error ?? 'Unauthorized', 401);
    }

    const redemption = await verifySpendRedemption(
      params.redemptionId,
      validated.walletAddress
    );
    return apiSuccess({ redemption }, 'Redemption verified. Points deducted.');
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError(error);
    }
    const message =
      error instanceof Error ? error.message : 'Failed to verify redemption';
    console.error('Error verifying spend redemption:', error);
    if (
      message === 'Unauthorized' ||
      message === 'Redemption already verified' ||
      message === 'Insufficient points' ||
      message === 'Redemption not found' ||
      message === 'This item is no longer available'
    ) {
      return apiError(message, 400);
    }
    return apiError(message, 500);
  }
}

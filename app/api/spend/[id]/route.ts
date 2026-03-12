import { NextRequest } from 'next/server';
import { getSpendItemById, createPendingSpendRedemption } from '@/lib/db/spend';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { spendPointsSchema } from '@/lib/schemas/spend';
import { verifyWalletOwnership } from '@/lib/api/privy';
import { ZodError } from 'zod';

// GET /api/spend/[id] - Get a single spend item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const item = await getSpendItemById(params.id);
    return apiSuccess({ item });
  } catch (error: any) {
    console.error('Error fetching spend item:', error);
    if (error?.code === 'PGRST116') {
      return apiError('Spend item not found', 404);
    }
    return apiError('Failed to fetch spend item', 500);
  }
}

// POST /api/spend/[id] - Create a pending redemption (no deduction). User verifies later to deduct points.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const validated = spendPointsSchema.parse({
      spendItemId: params.id,
      walletAddress: body.walletAddress,
    });

    const auth = await verifyWalletOwnership(request, validated.walletAddress);
    if (!auth.authorized) {
      return apiError(auth.error ?? 'Unauthorized', 401);
    }

    const redemption = await createPendingSpendRedemption(
      validated.spendItemId,
      validated.walletAddress
    );
    return apiSuccess(
      { redemption },
      'Redemption created. Verify at the bar to use it.'
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError(error);
    }
    const message =
      error instanceof Error ? error.message : 'Failed to create redemption';
    console.error('Error creating spend redemption:', error);
    return apiError(message, 400);
  }
}

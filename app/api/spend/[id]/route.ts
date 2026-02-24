import { NextRequest } from 'next/server';
import { getSpendItemById, spendPoints } from '@/lib/db/spend';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { spendPointsSchema } from '@/lib/schemas/spend';
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

// POST /api/spend/[id] - Spend points on an item
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

    const redemption = await spendPoints(validated.spendItemId, validated.walletAddress);
    return apiSuccess({ redemption }, 'Points spent successfully');
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError(error);
    }
    const message = error instanceof Error ? error.message : 'Failed to spend points';
    console.error('Error spending points:', error);
    return apiError(message, 400);
  }
}

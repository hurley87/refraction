import { NextRequest } from 'next/server';
import { fulfillRedemption } from '@/lib/db/spend';
import { requireAdmin } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api/response';

// POST /api/admin/spend/redemptions/[redemptionId]/fulfill - Mark a redemption as fulfilled
export async function POST(
  request: NextRequest,
  { params }: { params: { redemptionId: string } }
) {
  try {
    const { isValid } = await requireAdmin(request);
    if (!isValid) return apiError('Unauthorized', 401);

    const redemption = await fulfillRedemption(params.redemptionId);
    return apiSuccess({ redemption }, 'Redemption fulfilled');
  } catch (error) {
    console.error('Error fulfilling redemption:', error);
    return apiError('Failed to fulfill redemption', 500);
  }
}

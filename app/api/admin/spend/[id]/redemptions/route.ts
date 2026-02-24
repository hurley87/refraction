import { NextRequest } from 'next/server';
import { getSpendItemRedemptions } from '@/lib/db/spend';
import { requireAdmin } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api/response';

// GET /api/admin/spend/[id]/redemptions - Get redemptions for a specific spend item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isValid } = await requireAdmin(request);
    if (!isValid) return apiError('Unauthorized', 401);

    const redemptions = await getSpendItemRedemptions(params.id);
    return apiSuccess({ redemptions });
  } catch (error) {
    console.error('Error fetching redemptions:', error);
    return apiError('Failed to fetch redemptions', 500);
  }
}

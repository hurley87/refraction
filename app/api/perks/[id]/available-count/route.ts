import { NextRequest } from 'next/server';
import { getAvailableCodesCount } from '@/lib/db/perks';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

// GET /api/perks/[id]/available-count
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const count = await getAvailableCodesCount(params.id);
    return apiSuccess({ count });
  } catch (error) {
    console.error('Error fetching available codes count:', error);
    return apiError('Failed to fetch available codes count', 500);
  }
}
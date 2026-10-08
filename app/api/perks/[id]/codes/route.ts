import { NextRequest } from 'next/server';
import {
  getUniversalDiscountCodesByPerkId,
  perkHasIndividualDiscountCodes,
} from '@/lib/db/perks';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

// GET /api/perks/[id]/codes — universal codes only (individual codes are issued via redeem)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [codes, hasIndividualCodes] = await Promise.all([
      getUniversalDiscountCodesByPerkId(params.id),
      perkHasIndividualDiscountCodes(params.id),
    ]);
    return apiSuccess({ codes: codes ?? [], hasIndividualCodes });
  } catch (error) {
    console.error('GET /api/perks/[id]/codes error:', error);
    return apiError('Failed to fetch codes', 500);
  }
}

// POST /api/perks/[id]/codes — use /api/admin/perks/[id]/codes (admin only)
export async function POST() {
  return apiError('Forbidden', 403);
}

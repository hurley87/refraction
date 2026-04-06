import { NextRequest } from 'next/server';
import { getDiscountCodesByPerkId, createDiscountCodes } from '@/lib/db/perks';
import { apiSuccess, apiError } from '@/lib/api/response';
import { checkAdminPermission } from '@/lib/db/admin';

export const dynamic = 'force-dynamic';

// GET /api/admin/perks/[id]/codes - Get discount codes for a perk
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminEmail = request.headers.get('x-user-email') || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const codes = await getDiscountCodesByPerkId(params.id);
    return apiSuccess({ codes });
  } catch (error) {
    console.error('Error fetching discount codes:', error);
    return apiError('Failed to fetch discount codes', 500);
  }
}

// POST /api/admin/perks/[id]/codes - Create discount codes for a perk
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminEmail = request.headers.get('x-user-email') || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const { codes, is_universal } = await request.json();
    const createdCodes = await createDiscountCodes(
      params.id,
      codes,
      is_universal ?? false
    );
    return apiSuccess({ codes: createdCodes });
  } catch (error) {
    console.error('Error creating discount codes:', error);
    return apiError('Failed to create discount codes', 500);
  }
}

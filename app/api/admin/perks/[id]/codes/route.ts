import { NextRequest } from 'next/server';
import { getDiscountCodesByPerkId, createDiscountCodes } from '@/lib/db/perks';
import { apiSuccess, apiError } from '@/lib/api/response';

// GET /api/admin/perks/[id]/codes - Get discount codes for a perk
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    const { codes, is_universal } = await request.json();
    const createdCodes = await createDiscountCodes(params.id, codes, is_universal ?? false);
    return apiSuccess({ codes: createdCodes });
  } catch (error) {
    console.error('Error creating discount codes:', error);
    return apiError('Failed to create discount codes', 500);
  }
}
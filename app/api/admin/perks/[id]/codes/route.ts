import { NextRequest, NextResponse } from 'next/server';
import { getDiscountCodesByPerkId, createDiscountCodes } from '@/lib/db/perks';

// GET /api/admin/perks/[id]/codes - Get discount codes for a perk
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const codes = await getDiscountCodesByPerkId(params.id);
    return NextResponse.json({ codes });
  } catch (error) {
    console.error('Error fetching discount codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discount codes' },
      { status: 500 }
    );
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
    return NextResponse.json({ codes: createdCodes });
  } catch (error) {
    console.error('Error creating discount codes:', error);
    return NextResponse.json(
      { error: 'Failed to create discount codes' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getAvailableCodesCount } from '@/lib/db/perks';

export const dynamic = 'force-dynamic';

// GET /api/perks/[id]/available-count
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const count = await getAvailableCodesCount(params.id);
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching available codes count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available codes count' },
      { status: 500 }
    );
  }
}
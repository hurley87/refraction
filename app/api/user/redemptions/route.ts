import { NextRequest, NextResponse } from 'next/server';
import { getUserPerkRedemptions } from '@/lib/db/perks';

export const dynamic = 'force-dynamic';

// GET /api/user/redemptions?walletAddress=0x...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress is required' },
        { status: 400 }
      );
    }

    const redemptions = await getUserPerkRedemptions(walletAddress);
    return NextResponse.json({ redemptions });
  } catch (error) {
    console.error('Error fetching user redemptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user redemptions' },
      { status: 500 }
    );
  }
}
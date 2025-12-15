import { NextRequest } from 'next/server';
import { getUserPerkRedemptions } from '@/lib/db/perks';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

// GET /api/user/redemptions?walletAddress=0x...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return apiError('walletAddress is required', 400);
    }

    const redemptions = await getUserPerkRedemptions(walletAddress);
    return apiSuccess({ redemptions });
  } catch (error) {
    console.error('Error fetching user redemptions:', error);
    return apiError('Failed to fetch user redemptions', 500);
  }
}
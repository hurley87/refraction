import { NextRequest } from 'next/server';
import { getSpendItems } from '@/lib/db/spend';
import { getUserSpendRedemptions } from '@/lib/db/spend';
import { apiSuccess, apiError } from '@/lib/api/response';

// GET /api/spend - List active spend items (or user's redemptions if walletAddress provided)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (walletAddress) {
      const redemptions = await getUserSpendRedemptions(walletAddress);
      return apiSuccess({ redemptions });
    }

    const items = await getSpendItems(true);
    return apiSuccess({ items });
  } catch (error) {
    console.error('Error fetching spend items:', error);
    return apiError('Failed to fetch spend items', 500);
  }
}

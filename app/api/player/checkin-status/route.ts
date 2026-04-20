import { NextRequest } from 'next/server';
import { getPlayerByWallet } from '@/lib/db/players';
import { hasPlayerAnyLocationCheckin } from '@/lib/db/checkins';
import { getPlayerRequestSchema } from '@/lib/schemas/api';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    const validationResult = getPlayerRequestSchema.safeParse({
      walletAddress,
    });

    if (!validationResult.success) {
      return apiValidationError(validationResult.error);
    }

    const player = await getPlayerByWallet(validationResult.data.walletAddress);

    if (!player?.id) {
      return apiError('Player not found', 404);
    }

    const hasAnyLocationCheckin = await hasPlayerAnyLocationCheckin(player.id);

    return apiSuccess({ hasAnyLocationCheckin });
  } catch (error) {
    console.error('Player check-in status API error:', error);
    return apiError('Failed to load check-in status', 500);
  }
}

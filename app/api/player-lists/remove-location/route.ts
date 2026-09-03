import { NextRequest } from 'next/server';
import { getPlayerByWallet } from '@/lib/db/players';
import { supabase } from '@/lib/db/client';
import {
  countListsContainingLocation,
  removeLocationFromCustomList,
} from '@/lib/db/player-custom-lists';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { playerCustomListRemoveLocationSchema } from '@/lib/schemas/api';

async function getLocationIdByPlaceId(placeId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('locations')
    .select('id')
    .eq('place_id', placeId)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = playerCustomListRemoveLocationSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { walletAddress, placeId, listId } = parsed.data;

    const player = await getPlayerByWallet(walletAddress);
    if (!player?.id) {
      return apiError('Player not found', 404);
    }

    const locationId = await getLocationIdByPlaceId(placeId);
    if (locationId == null) {
      return apiError('Location not found', 404);
    }

    const removed = await removeLocationFromCustomList(
      player.id,
      locationId,
      listId
    );
    if (!removed) {
      return apiError('List not found', 404);
    }

    const savedListCount = await countListsContainingLocation(
      player.id,
      locationId
    );

    return apiSuccess({ placeId, listId, savedListCount });
  } catch (error) {
    console.error('Failed to remove location from list:', error);
    return apiError('Failed to remove location from list', 500);
  }
}

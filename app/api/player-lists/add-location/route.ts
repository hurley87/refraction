import { NextRequest } from 'next/server';
import { getPlayerByWallet } from '@/lib/db/players';
import { supabase } from '@/lib/db/client';
import {
  addLocationToLists,
  countListsContainingLocation,
} from '@/lib/db/player-custom-lists';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { playerCustomListAddLocationSchema } from '@/lib/schemas/api';

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
    const parsed = playerCustomListAddLocationSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { walletAddress, placeId, listIds } = parsed.data;

    const player = await getPlayerByWallet(walletAddress);
    if (!player?.id) {
      return apiError('Player not found', 404);
    }

    const locationId = await getLocationIdByPlaceId(placeId);
    if (locationId == null) {
      return apiError('Location not found', 404);
    }

    await addLocationToLists(player.id, locationId, listIds);
    const savedListCount = await countListsContainingLocation(
      player.id,
      locationId
    );

    return apiSuccess({ placeId, savedListCount });
  } catch (error) {
    console.error('Failed to add location to lists:', error);
    return apiError('Failed to add location to lists', 500);
  }
}

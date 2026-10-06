import { NextRequest } from 'next/server';
import { getPlayerByWallet, updatePlayerPoints } from '@/lib/db/players';
import { supabase } from '@/lib/db/client';
import { setPlayerVisitStatus } from '@/lib/db/checkins';
import { createOrGetLocation } from '@/lib/db/locations';
import {
  addLocationToLists,
  countListsContainingLocation,
} from '@/lib/db/player-custom-lists';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { retrySupabaseNetworkOperation } from '@/lib/db/supabase-network-error';
import { playerCustomListAddLocationSchema } from '@/lib/schemas/api';
import type { Location } from '@/lib/types';

const SAVE_SPOT_POINTS = 100;

/** Supabase occasionally drops the connection; retry reads and the idempotent list insert. */
function withDbRetry<T>(operation: () => Promise<T>): Promise<T> {
  return retrySupabaseNetworkOperation(operation, {
    maxAttempts: 3,
    delayMs: 200,
  });
}

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

    const { walletAddress, placeId, listIds, visitStatus, comment, location } =
      parsed.data;

    const player = await withDbRetry(() => getPlayerByWallet(walletAddress));
    if (!player?.id) {
      return apiError('Player not found', 404);
    }

    let locationId = await withDbRetry(() => getLocationIdByPlaceId(placeId));
    if (locationId == null) {
      if (!location) {
        return apiError('Location not found', 404);
      }

      const locationInfo: Omit<Location, 'id' | 'created_at' | 'category'> = {
        place_id: placeId,
        name: location.name,
        address: location.address ?? location.name,
        latitude: location.latitude,
        longitude: location.longitude,
        points_value: SAVE_SPOT_POINTS,
        is_visible: true,
        creator_wallet_address: walletAddress.trim(),
        creator_username: player.username,
      };
      const created = await withDbRetry(() =>
        createOrGetLocation(locationInfo)
      );
      locationId = created.id ?? null;
    }

    if (locationId == null) {
      return apiError('Location not found', 404);
    }

    const resolvedLocationId = locationId;
    const playerId = player.id;

    const listsBefore = await withDbRetry(() =>
      countListsContainingLocation(playerId, resolvedLocationId)
    );

    if (visitStatus) {
      await withDbRetry(() =>
        setPlayerVisitStatus(
          playerId,
          resolvedLocationId,
          visitStatus,
          comment,
          { allowDowngrade: true }
        )
      );
    }

    await withDbRetry(() =>
      addLocationToLists(playerId, resolvedLocationId, listIds)
    );

    const savedListCount = await withDbRetry(() =>
      countListsContainingLocation(playerId, resolvedLocationId)
    );

    let pointsEarned = 0;
    if (listsBefore === 0 && player.wallet_address) {
      const { error: activityError } = await supabase
        .from('points_activities')
        .insert({
          user_wallet_address: player.wallet_address,
          activity_type: 'spot_saved',
          points_earned: SAVE_SPOT_POINTS,
          description: 'Saved a spot to a list',
          metadata: { place_id: placeId, location_id: resolvedLocationId },
          processed: true,
        });
      if (activityError) throw activityError;

      await updatePlayerPoints(playerId, SAVE_SPOT_POINTS);
      pointsEarned = SAVE_SPOT_POINTS;
    }

    return apiSuccess({ placeId, savedListCount, pointsEarned });
  } catch (error) {
    console.error('Failed to add location to lists:', error);
    return apiError('Failed to add location to lists', 500);
  }
}

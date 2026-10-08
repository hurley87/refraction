import { NextRequest } from 'next/server';
import { getPlayerByWallet } from '@/lib/db/players';
import { supabase } from '@/lib/db/client';
import { setPlayerVisitStatus } from '@/lib/db/checkins';
import { createOrGetLocation } from '@/lib/db/locations';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { locationVisitStatusSchema } from '@/lib/schemas/api';
import type { Location } from '@/lib/types';

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
    const parsed = locationVisitStatusSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { walletAddress, placeId, visitStatus, comment, location } =
      parsed.data;

    const player = await getPlayerByWallet(walletAddress);
    if (!player?.id) {
      return apiError('Player not found', 404);
    }

    let locationId = await getLocationIdByPlaceId(placeId);
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
        points_value: 100,
        is_visible: true,
        creator_wallet_address: walletAddress.trim(),
        creator_username: player.username,
      };
      const created = await createOrGetLocation(locationInfo);
      locationId = created.id ?? null;
    }

    if (locationId == null) {
      return apiError('Location not found', 404);
    }

    await setPlayerVisitStatus(player.id, locationId, visitStatus, comment, {
      allowDowngrade: true,
    });

    return apiSuccess({ placeId, visitStatus });
  } catch (error) {
    console.error('Failed to save visit status:', error);
    return apiError('Failed to save visit status', 500);
  }
}

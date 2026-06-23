import { NextRequest } from 'next/server';
import { getPlayerByWallet, createOrUpdatePlayer } from '@/lib/db/players';
import { supabase } from '@/lib/db/client';
import {
  addFavorite,
  removeFavorite,
  listFavoritePlaceIdsByPlayer,
  listFavoriteLocationsByPlayer,
} from '@/lib/db/favorites';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import {
  locationFavoriteRequestSchema,
  locationFavoritesQuerySchema,
} from '@/lib/schemas/api';

async function getLocationIdByPlaceId(placeId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('locations')
    .select('id')
    .eq('place_id', placeId)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = locationFavoritesQuerySchema.safeParse({
      walletAddress: searchParams.get('walletAddress'),
      includeLocations: searchParams.get('includeLocations') ?? undefined,
    });

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { walletAddress, includeLocations } = parsed.data;
    const player = await getPlayerByWallet(walletAddress);

    if (!player?.id) {
      return apiSuccess(
        includeLocations ? { placeIds: [], locations: [] } : { placeIds: [] }
      );
    }

    if (includeLocations) {
      const [placeIds, locations] = await Promise.all([
        listFavoritePlaceIdsByPlayer(player.id),
        listFavoriteLocationsByPlayer(player.id),
      ]);
      return apiSuccess({ placeIds, locations });
    }

    const placeIds = await listFavoritePlaceIdsByPlayer(player.id);
    return apiSuccess({ placeIds });
  } catch (error) {
    console.error('Failed to fetch location favorites:', error);
    return apiError('Failed to fetch favorites', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = locationFavoriteRequestSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { walletAddress, placeId, favorited } = parsed.data;

    const player = await createOrUpdatePlayer({
      wallet_address: walletAddress,
      total_points: 0,
    });

    if (!player.id) {
      return apiError('Failed to resolve player', 500);
    }

    const locationId = await getLocationIdByPlaceId(placeId);
    if (locationId == null) {
      return apiError('Location not found', 404);
    }

    if (favorited) {
      await addFavorite(player.id, locationId);
    } else {
      await removeFavorite(player.id, locationId);
    }

    return apiSuccess({ favorited, placeId });
  } catch (error) {
    console.error('Failed to update location favorite:', error);
    return apiError('Failed to update favorite', 500);
  }
}

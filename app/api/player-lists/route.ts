import { NextRequest } from 'next/server';
import { getPlayerByWallet, createOrUpdatePlayer } from '@/lib/db/players';
import { supabase } from '@/lib/db/client';
import {
  createCustomList,
  deleteCustomList,
  listCustomListsByPlayer,
  listCustomListsWithLocationsByPlayer,
} from '@/lib/db/player-custom-lists';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import {
  playerCustomListsQuerySchema,
  playerCustomListCreateSchema,
  playerCustomListDeleteSchema,
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
    const parsed = playerCustomListsQuerySchema.safeParse({
      walletAddress: searchParams.get('walletAddress'),
      placeId: searchParams.get('placeId') ?? undefined,
      includeLocations: searchParams.get('includeLocations') ?? undefined,
    });

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { walletAddress, placeId, includeLocations } = parsed.data;
    const player = await getPlayerByWallet(walletAddress);

    if (!player?.id) {
      return apiSuccess({ lists: [] });
    }

    if (includeLocations) {
      const lists = await listCustomListsWithLocationsByPlayer(player.id);
      return apiSuccess({ lists });
    }

    const locationId = placeId ? await getLocationIdByPlaceId(placeId) : null;
    const lists = await listCustomListsByPlayer(player.id, locationId);
    return apiSuccess({ lists });
  } catch (error) {
    console.error('Failed to fetch player custom lists:', error);
    return apiError('Failed to fetch lists', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = playerCustomListCreateSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { walletAddress, title, thumbnailUrl, isPrivate } = parsed.data;

    const player = await createOrUpdatePlayer({
      wallet_address: walletAddress,
      total_points: 0,
    });

    if (!player.id) {
      return apiError('Failed to resolve player', 500);
    }

    const list = await createCustomList(player.id, {
      title,
      thumbnailUrl,
      isPrivate,
    });

    return apiSuccess({ list });
  } catch (error) {
    console.error('Failed to create player custom list:', error);
    return apiError('Failed to create list', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = playerCustomListDeleteSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { walletAddress, listId } = parsed.data;
    const player = await getPlayerByWallet(walletAddress);

    if (!player?.id) {
      return apiError('Player not found', 404);
    }

    const deleted = await deleteCustomList(player.id, listId);

    if (!deleted) {
      return apiError('List not found', 404);
    }

    return apiSuccess({ listId });
  } catch (error) {
    console.error('Failed to delete player custom list:', error);
    return apiError('Failed to delete list', 500);
  }
}

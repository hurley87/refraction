import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { getPlayerIdByWalletAddress } from '@/lib/db/players';
import { apiSuccess, apiError } from '@/lib/api/response';
import {
  AVATAR_CACHE_CONTROL,
  groupCheckinsByPlaceId,
  isTransientCheckinsError,
  parseLimit,
  parsePlaceIds,
  parsePurpose,
  shapeCheckinEntry,
  type RawCheckinRow,
} from '@/lib/api/location-comments';

const FULL_CHECKIN_SELECT = `
  id,
  location_id,
  comment,
  image_url,
  points_earned,
  created_at,
  checkin_at,
  players:player_id (
    username,
    wallet_address,
    profile_picture_url
  )
`;

const AVATAR_CHECKIN_SELECT = `
  id,
  location_id,
  created_at,
  checkin_at,
  players:player_id (
    username,
    wallet_address,
    profile_picture_url
  )
`;

function avatarSuccess<T>(data: T) {
  return NextResponse.json(
    { success: true, data },
    {
      status: 200,
      headers: { 'Cache-Control': AVATAR_CACHE_CONTROL },
    }
  );
}

async function fetchCheckinsForLocations(
  locationIds: number[],
  limit: number,
  purpose: 'full' | 'avatars'
): Promise<{ data: RawCheckinRow[] | null; error: unknown }> {
  if (locationIds.length === 0) {
    return { data: [], error: null };
  }

  const select =
    purpose === 'avatars' ? AVATAR_CHECKIN_SELECT : FULL_CHECKIN_SELECT;
  const fetchLimit = Math.min(locationIds.length * limit, 200);

  let query = supabase
    .from('player_location_checkins')
    .select(select)
    .in('location_id', locationIds)
    .order('created_at', { ascending: false })
    .limit(fetchLimit);

  if (purpose === 'full') {
    query = query.not('comment', 'is', null);
  }

  const { data, error } = await query;
  return { data: (data as RawCheckinRow[] | null) ?? [], error };
}

async function handleBatchAvatars(
  placeIds: string[],
  limit: number
): Promise<ReturnType<typeof apiSuccess>> {
  const { data: locations, error: locationsError } = await supabase
    .from('locations')
    .select('id, place_id')
    .in('place_id', placeIds);

  if (locationsError) {
    throw locationsError;
  }

  const locationIdToPlaceId = new Map<number, string>();
  for (const location of locations ?? []) {
    if (location.id != null && location.place_id) {
      locationIdToPlaceId.set(location.id, location.place_id);
    }
  }

  const locationIds = [...locationIdToPlaceId.keys()];
  const { data: checkinData, error: checkinError } =
    await fetchCheckinsForLocations(locationIds, limit, 'avatars');

  if (checkinError) {
    if (isTransientCheckinsError(checkinError)) {
      console.error('Location comments batch avatars degraded:', checkinError);
      return avatarSuccess({ checkinsByPlaceId: {} as Record<string, never> });
    }
    throw checkinError;
  }

  const checkinsByPlaceId = groupCheckinsByPlaceId(
    checkinData ?? [],
    locationIdToPlaceId,
    limit,
    'avatars'
  );

  return avatarSuccess({ checkinsByPlaceId });
}

async function handleSinglePlace(
  placeId: string,
  limit: number,
  purpose: 'full' | 'avatars',
  walletAddress: string | undefined
): Promise<ReturnType<typeof apiSuccess>> {
  const walletForStatus = purpose === 'full' ? walletAddress : undefined;

  const locationPromise = supabase
    .from('locations')
    .select('id, place_id')
    .eq('place_id', placeId)
    .single();

  const playerIdPromise = walletForStatus
    ? getPlayerIdByWalletAddress(walletForStatus)
    : Promise.resolve(null);

  const [locationResult, playerId] = await Promise.all([
    locationPromise,
    playerIdPromise,
  ]);

  const { data: locationData, error: locationError } = locationResult;

  if (locationError) {
    if (locationError.code === 'PGRST116') {
      if (purpose === 'avatars') {
        return avatarSuccess({ checkins: [] });
      }
      return apiSuccess({ checkins: [], hasUserCheckedIn: false });
    }
    throw locationError;
  }

  const locationId = locationData?.id;
  if (!locationId) {
    if (purpose === 'avatars') {
      return avatarSuccess({ checkins: [] });
    }
    return apiSuccess({ checkins: [], hasUserCheckedIn: false });
  }

  let hasUserCheckedIn = false;
  if (purpose === 'full' && playerId != null) {
    const { data: existingCheckin, error: existingError } = await supabase
      .from('player_location_checkins')
      .select('id')
      .eq('location_id', locationId)
      .eq('player_id', playerId)
      .limit(1)
      .maybeSingle();

    if (!existingError) {
      hasUserCheckedIn = existingCheckin != null;
    }
  }

  const { data: checkinData, error: checkinError } =
    await fetchCheckinsForLocations([locationId], limit, purpose);

  if (checkinError) {
    if (purpose === 'avatars' && isTransientCheckinsError(checkinError)) {
      console.error('Location comments avatars degraded:', checkinError);
      return avatarSuccess({ checkins: [] });
    }
    throw checkinError;
  }

  const checkins = (checkinData ?? [])
    .slice(0, limit)
    .map((entry) => shapeCheckinEntry(entry, purpose));

  if (purpose === 'avatars') {
    return avatarSuccess({ checkins });
  }

  return apiSuccess({ checkins, hasUserCheckedIn });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const purpose = parsePurpose(searchParams.get('purpose'));
    const placeIdsParam = searchParams.get('placeIds');
    const singlePlaceId = searchParams.get('placeId');
    const placeIds = parsePlaceIds(placeIdsParam, singlePlaceId);
    const defaultLimit = purpose === 'avatars' ? 3 : 6;
    const limit = parseLimit(searchParams.get('limit'), defaultLimit);
    const walletAddress =
      searchParams.get('walletAddress')?.trim() || undefined;

    if (placeIds.length === 0) {
      return apiError('placeId or placeIds query parameter is required', 400);
    }

    if (placeIdsParam && purpose !== 'avatars') {
      return apiError('Batch requests require purpose=avatars', 400);
    }

    if (placeIdsParam?.trim()) {
      return handleBatchAvatars(placeIds, limit);
    }

    return handleSinglePlace(placeIds[0], limit, purpose, walletAddress);
  } catch (error) {
    console.error('Location comments API error:', error);
    return apiError('Failed to fetch location comments', 500);
  }
}

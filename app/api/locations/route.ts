import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db/client';
import {
  trackLocationCreated,
  trackPointsEarned,
  resolveServerIdentity,
} from '@/lib/analytics';
import { trackCityMilestone } from '@/lib/analytics/server';
import { setUserProperties as setUserPropertiesServer } from '@/lib/analytics/server';
import { checkAdminPermission } from '@/lib/db/admin';
import { MAX_LOCATIONS_PER_WEEK, SUPABASE_ERROR_CODES } from '@/lib/constants';
import { getUtcWeekBounds } from '@/lib/utils/date';
import {
  sanitizeVarchar,
  sanitizeOptionalVarchar,
  validateUrl,
} from '@/lib/utils/validation';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveCityFromCoordinates } from '@/lib/utils/city-resolver';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    const includeHidden = searchParams.get('includeHidden') === 'true';

    // Only allow includeHidden if admin
    if (includeHidden) {
      const adminEmail = request.headers.get('x-user-email');
      if (!checkAdminPermission(adminEmail || undefined)) {
        return apiError('Unauthorized', 403);
      }
    }

    // Base query - only return locations with images
    let query = supabase
      .from('locations')
      .select(
        'id, name, address, description, latitude, longitude, place_id, points_value, type, event_url, context, created_at, coin_address, coin_name, coin_symbol, coin_image_url, creator_wallet_address, creator_username, is_visible'
      )
      .not('coin_image_url', 'is', null);

    // Filter by visibility unless admin requested all
    if (!includeHidden) {
      query = query.eq('is_visible', true);
    }

    // If filtering by player's check-ins, join through player_location_checkins
    if (walletAddress) {
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single();

      if (playerError) {
        if (playerError.code === SUPABASE_ERROR_CODES.NOT_FOUND) {
          return apiSuccess({ locations: [] });
        }
        throw playerError;
      }

      let checkinQuery = supabase
        .from('player_location_checkins')
        .select(
          `
          locations!inner (
            id, name, address, description, latitude, longitude, place_id, points_value, type, event_url, context, created_at, coin_address, coin_name, coin_symbol, coin_image_url, creator_wallet_address, creator_username, is_visible
          )
        `
        )
        .eq('player_id', player.id)
        .not('locations.coin_image_url', 'is', null);

      // Filter by visibility unless admin requested all
      if (!includeHidden) {
        checkinQuery = checkinQuery.eq('locations.is_visible', true);
      }

      const { data, error } = await checkinQuery;

      if (error) throw error;

      const locations = (data || [])
        .map((row: { locations: unknown }) => row.locations)
        .filter(Boolean);

      return apiSuccess({ locations });
    }

    const { data, error } = await query;
    if (error) throw error;

    return apiSuccess({ locations: data || [] });
  } catch (error) {
    console.error('Locations API error:', error);
    return apiError('Failed to fetch locations', 500);
  }
}

const isDuplicateKeyError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: string }).code === '23505';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      place_id,
      name,
      address,
      description,
      lat,
      lon,
      type,
      eventUrl,
      walletAddress,
      username,
      locationImage,
    } = body;

    const latProvided =
      lat !== null && lat !== undefined && String(lat).trim() !== '';
    const lonProvided =
      lon !== null && lon !== undefined && String(lon).trim() !== '';

    // Validate required fields (lat/lon may be 0 — do not use truthiness)
    if (
      typeof place_id !== 'string' ||
      !place_id.trim() ||
      typeof name !== 'string' ||
      !name.trim() ||
      !latProvided ||
      !lonProvided ||
      typeof walletAddress !== 'string' ||
      !walletAddress.trim()
    ) {
      return apiError('Missing required fields', 400);
    }

    // Validate that locationImage is provided (required since GET endpoint filters by it)
    if (
      !locationImage ||
      typeof locationImage !== 'string' ||
      locationImage.trim() === ''
    ) {
      return apiError('Location image is required', 400);
    }

    const sanitizedPlaceId = sanitizeVarchar(place_id);
    const sanitizedName = sanitizeVarchar(name);
    const sanitizedAddress = address
      ? sanitizeOptionalVarchar(address)
      : sanitizedName; // Fallback to name if address not provided
    const sanitizedDescription = sanitizeOptionalVarchar(description);
    const sanitizedType =
      typeof type === 'string' && type.trim()
        ? sanitizeVarchar(type)
        : 'location';

    // Validate and sanitize eventUrl - must be a valid URL if provided
    const eventUrlResult = validateUrl(eventUrl);
    if (!eventUrlResult.valid) {
      return apiError(eventUrlResult.error || 'Invalid URL', 400);
    }
    const sanitizedEventUrl = eventUrlResult.url;

    const sanitizedWalletAddress = walletAddress.trim();
    const sanitizedUsername = sanitizeOptionalVarchar(username);
    const normalizedLocationImage = locationImage.trim();

    const parsedLat = parseFloat(String(lat));
    const parsedLon = parseFloat(String(lon));
    if (
      Number.isNaN(parsedLat) ||
      Number.isNaN(parsedLon) ||
      parsedLat < -90 ||
      parsedLat > 90 ||
      parsedLon < -180 ||
      parsedLon > 180
    ) {
      return apiError('Invalid latitude or longitude', 400);
    }

    // Ensure location doesn't already exist before proceeding
    const { data: existingLocation, error: locationLookupError } =
      await supabase
        .from('locations')
        .select(
          'id, name, creator_wallet_address, creator_username, coin_image_url, latitude, longitude'
        )
        .eq('place_id', sanitizedPlaceId)
        .maybeSingle();

    if (
      locationLookupError &&
      locationLookupError.code !== SUPABASE_ERROR_CODES.NOT_FOUND
    ) {
      console.error('Error checking duplicate location:', locationLookupError);
      throw locationLookupError;
    }

    if (existingLocation) {
      return apiError('Location already exists for this place_id', 409);
    }

    // Check if user has already created too many locations this week
    const { startIso, endIso } = getUtcWeekBounds();
    const { data: existingLocations, error: checkError } = await supabase
      .from('locations')
      .select('id')
      .eq('creator_wallet_address', sanitizedWalletAddress)
      .gte('created_at', startIso)
      .lt('created_at', endIso);

    if (checkError) {
      console.error('Error checking existing locations:', checkError);
      throw checkError;
    }

    if (
      existingLocations &&
      existingLocations.length >= MAX_LOCATIONS_PER_WEEK
    ) {
      return apiError(
        `You can only add ${MAX_LOCATIONS_PER_WEEK} locations per week. Come back next week!`,
        429
      );
    }

    const creatorEmail = request.headers.get('x-user-email');

    // Resolve city from coordinates (and fall back to context JSON if present)
    const resolvedCity = resolveCityFromCoordinates(parsedLat, parsedLon);

    // New locations are public on the map as long as place_id is unique (checked above)
    const locationInsertPayload = {
      place_id: sanitizedPlaceId,
      name: sanitizedName,
      address: sanitizedAddress,
      description: sanitizedDescription,
      latitude: parsedLat,
      longitude: parsedLon,
      type: sanitizedType,
      event_url: sanitizedEventUrl,
      points_value: 100,
      creator_wallet_address: sanitizedWalletAddress,
      creator_username: sanitizedUsername,
      coin_image_url: normalizedLocationImage,
      is_visible: true,
      city: resolvedCity,
      context: JSON.stringify({
        created_at: new Date().toISOString(),
      }),
    };

    console.log('Creating location with payload:', locationInsertPayload);

    const { data: locationData, error: locationError } = await supabase
      .from('locations')
      .insert(locationInsertPayload)
      .select()
      .single();

    if (locationError) {
      if (isDuplicateKeyError(locationError)) {
        return apiError('Location already exists for this place_id', 409);
      }
      throw locationError;
    }

    // Award 100 points to the user for creating a location
    const pointsAwarded = 100;

    const { error: pointsError } = await supabase
      .from('points_activities')
      .insert({
        user_wallet_address: sanitizedWalletAddress,
        activity_type: 'location_creation',
        points_earned: pointsAwarded,
        description: `Created location: ${sanitizedName}`,
        metadata: {
          location_id: locationData.id,
          location_name: sanitizedName,
          place_id: sanitizedPlaceId,
        },
        processed: true,
      });

    if (pointsError) {
      console.error('Error awarding points:', pointsError);
    }

    // Use the resolved city; fall back to context JSON if coordinate resolver missed
    let city: string | undefined = resolvedCity ?? undefined;
    let country: string | undefined;
    if (!city) {
      try {
        const context = locationData.context
          ? JSON.parse(locationData.context)
          : {};
        city = context.city;
        country = context.country;
      } catch {
        // Context parsing failed, ignore
      }
    }

    const distinctId = resolveServerIdentity({
      email: creatorEmail || undefined,
      walletAddress: sanitizedWalletAddress,
    });

    setUserPropertiesServer(distinctId, {
      $email: creatorEmail || undefined,
      wallet_address: sanitizedWalletAddress,
    });

    // Track location creation
    trackLocationCreated(distinctId, {
      location_id: locationData.id!,
      city,
      country,
      place_id: sanitizedPlaceId,
      type: sanitizedType,
      creator_wallet_address: sanitizedWalletAddress,
    });

    // Track points earned
    trackPointsEarned(distinctId, {
      activity_type: 'location_creation',
      amount: pointsAwarded,
      description: `Created location: ${sanitizedName}`,
    });

    // Fire city milestone event when a city crosses a threshold
    if (city) {
      try {
        const { count } = await supabase
          .from('locations')
          .select('id', { count: 'exact', head: true })
          .eq('city', city)
          .eq('is_visible', true);

        const MILESTONES = [10, 25, 50, 100, 250, 500];
        if (count !== null && MILESTONES.includes(count)) {
          trackCityMilestone(distinctId, {
            city,
            spot_count: count,
            milestone: count,
          });
        }
      } catch {
        // Non-critical — don't fail the response
      }
    }

    return apiSuccess({
      location: locationData,
      pointsAwarded,
    });
  } catch (error) {
    console.error('Create location API error:', error);
    if (isDuplicateKeyError(error)) {
      return apiError('Location already exists for this place_id', 409);
    }
    return apiError('Failed to create location', 500);
  }
}

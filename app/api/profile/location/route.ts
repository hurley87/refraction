import { NextRequest } from 'next/server';
import { getCountryById } from '@/lib/db/countries';
import { upsertGeoCity } from '@/lib/db/geo-cities';
import { getUserProfile, updatePlayerGeoLocation } from '@/lib/db/profiles';
import { updatePlayerLocationSchema } from '@/lib/schemas/player';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

type MapboxRetrieveFeature = {
  properties?: {
    mapbox_id?: string;
    name?: string;
    name_preferred?: string;
    feature_type?: string;
    coordinates?: { latitude?: number; longitude?: number };
    context?: {
      country?: { country_code?: string; name?: string };
      region?: { name?: string };
    };
  };
  geometry?: { coordinates?: [number, number] };
};

/**
 * POST /api/profile/location
 * Upserts a Mapbox city into geo_cities and sets player country_id / geo_city_id.
 * Also syncs legacy city / country text fields.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = updatePlayerLocationSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const {
      walletAddress,
      countryId,
      mapboxId,
      name,
      region,
      latitude,
      longitude,
    } = parsed.data;

    const profile = await getUserProfile(walletAddress);
    if (!profile) {
      return apiError('Player not found', 404);
    }

    const country = await getCountryById(countryId);
    if (!country) {
      return apiError('Unknown country', 404);
    }

    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!accessToken) {
      return apiError('Mapbox is not configured', 500);
    }

    // Verify the Mapbox place exists and belongs to the selected country.
    const sessionToken = crypto.randomUUID();
    const retrieveUrl = `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(
      mapboxId
    )}?session_token=${sessionToken}&access_token=${accessToken}`;
    const retrieveRes = await fetch(retrieveUrl);
    if (!retrieveRes.ok) {
      return apiError('Could not verify city selection', 400);
    }

    const retrieveJson = (await retrieveRes.json()) as {
      features?: MapboxRetrieveFeature[];
    };
    const feature = retrieveJson.features?.[0];
    const props = feature?.properties;
    if (!props?.mapbox_id) {
      return apiError('Invalid city selection', 400);
    }

    const featureType = props.feature_type;
    if (featureType && featureType !== 'place' && featureType !== 'locality') {
      return apiError('Selection must be a city or locality', 400);
    }

    const featureCountryCode = props.context?.country?.country_code
      ?.trim()
      .toUpperCase();
    if (featureCountryCode && featureCountryCode !== country.iso2) {
      return apiError('City does not match selected country', 400);
    }

    const resolvedName =
      props.name_preferred?.trim() || props.name?.trim() || name.trim();
    const resolvedRegion =
      props.context?.region?.name?.trim() || region?.trim() || null;
    const coords = feature?.geometry?.coordinates;
    const resolvedLng =
      longitude ??
      props.coordinates?.longitude ??
      (Array.isArray(coords) ? coords[0] : null);
    const resolvedLat =
      latitude ??
      props.coordinates?.latitude ??
      (Array.isArray(coords) ? coords[1] : null);

    const geoCity = await upsertGeoCity({
      countryId: country.id,
      mapboxId: props.mapbox_id,
      name: resolvedName,
      region: resolvedRegion,
      latitude: typeof resolvedLat === 'number' ? resolvedLat : null,
      longitude: typeof resolvedLng === 'number' ? resolvedLng : null,
    });

    if (geoCity.countryId !== country.id) {
      return apiError('City country mismatch', 400);
    }

    const updated = await updatePlayerGeoLocation(walletAddress, {
      countryId: country.id,
      geoCityId: geoCity.id,
      cityName: geoCity.name,
      countryName: country.name,
    });

    return apiSuccess({
      profile: updated,
      country,
      geoCity,
    });
  } catch (error) {
    console.error('Error updating player location:', error);
    return apiError('Failed to update location', 500);
  }
}

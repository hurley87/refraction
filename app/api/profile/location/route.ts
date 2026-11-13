import { NextRequest } from 'next/server';
import { getCountryById } from '@/lib/db/countries';
import { upsertGeoCity } from '@/lib/db/geo-cities';
import { getUserProfile, updatePlayerGeoLocation } from '@/lib/db/profiles';
import { verifyMapboxCity } from '@/lib/geo/verify-mapbox-city';
import { updatePlayerLocationSchema } from '@/lib/schemas/player';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

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

    const verified = await verifyMapboxCity({
      mapboxId,
      countryIso2: country.iso2,
      name,
      region,
      latitude,
      longitude,
    });
    if (!verified.ok) {
      return apiError(verified.error, verified.status);
    }

    const geoCity = await upsertGeoCity({
      countryId: country.id,
      ...verified.city,
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

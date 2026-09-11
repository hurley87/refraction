import { NextRequest } from 'next/server';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { getAuthenticatedAdminEmail } from '@/lib/auth';
import { getCountryById } from '@/lib/db/countries';
import { upsertGeoCity } from '@/lib/db/geo-cities';
import {
  AdminPlayerConflictError,
  AdminPlayerWalletRequiredError,
  createAdminPlayer,
  type CreateAdminPlayerInput,
} from '@/lib/db/players';
import { adminCreatePlayerRequestSchema } from '@/lib/schemas/api';

export const dynamic = 'force-dynamic';

type LocationInput = NonNullable<
  ReturnType<typeof adminCreatePlayerRequestSchema.parse>['location']
>;

/** Upserts the picked Mapbox city so the new player gets geo FKs, not free text. */
async function resolveLocation(
  location: LocationInput
): Promise<CreateAdminPlayerInput['location']> {
  const country = await getCountryById(location.countryId);
  if (!country) return undefined;

  const geoCity = await upsertGeoCity({
    countryId: country.id,
    mapboxId: location.mapboxId,
    name: location.name,
    region: location.region ?? null,
  });

  return {
    countryId: country.id,
    geoCityId: geoCity.id,
    cityName: geoCity.name,
    countryName: country.name,
  };
}

/** POST /api/admin/users/create — insert a player from the admin UI. */
export async function POST(request: NextRequest) {
  try {
    const adminEmail = await getAuthenticatedAdminEmail(request);
    if (!adminEmail) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON', 400);
    }

    const parsed = adminCreatePlayerRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { location, ...fields } = parsed.data;

    let resolvedLocation: CreateAdminPlayerInput['location'];
    if (location) {
      resolvedLocation = await resolveLocation(location);
      if (!resolvedLocation) {
        return apiError('Unknown country', 404);
      }
    }

    const player = await createAdminPlayer({
      ...fields,
      location: resolvedLocation,
    });

    return apiSuccess({ player }, 'User created', 201);
  } catch (error) {
    if (error instanceof AdminPlayerConflictError) {
      return apiError(error.message, 409);
    }
    if (error instanceof AdminPlayerWalletRequiredError) {
      return apiError(error.message, 400);
    }
    console.error('Failed to create admin user:', error);
    return apiError('Failed to create user', 500);
  }
}

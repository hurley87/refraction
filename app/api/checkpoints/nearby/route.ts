import { NextRequest } from 'next/server';
import { z } from 'zod';
import { listActiveCheckpoints } from '@/lib/db/checkpoints';
import {
  haversineKm,
  parseInteractiveMapCoordsFromUrl,
} from '@/lib/utils/checkpoint-map-link';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';

const nearbyQuerySchema = z.object({
  lat: z.coerce.number().gte(-90).lte(90),
  lng: z.coerce.number().gte(-180).lte(180),
  radiusKm: z.coerce.number().gte(1).lte(200).optional().default(40),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = nearbyQuerySchema.safeParse({
      lat: searchParams.get('lat'),
      lng: searchParams.get('lng'),
      radiusKm: searchParams.get('radiusKm') ?? undefined,
    });

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { lat, lng, radiusKm } = parsed.data;
    const checkpoints = await listActiveCheckpoints();

    const withDistance = checkpoints
      .filter((cp) => cp.checkpoint_mode === 'checkin')
      .map((cp) => {
        const coords = parseInteractiveMapCoordsFromUrl(cp.cta_url);
        if (!coords) return null;
        const distanceKm = haversineKm(lat, lng, coords.lat, coords.lng);
        if (distanceKm > radiusKm) return null;
        return {
          id: cp.id,
          name: cp.name,
          description: cp.description ?? null,
          points_value: cp.points_value,
          distance_km: Math.round(distanceKm * 10) / 10,
          cta_url: cp.cta_url ?? null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null)
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, 5);

    return apiSuccess({ checkpoints: withDistance });
  } catch (error) {
    console.error('Nearby checkpoints API error:', error);
    return apiError('Failed to load nearby checkpoints', 500);
  }
}

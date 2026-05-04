import { NextRequest } from 'next/server';
import { getCityMetrics } from '@/lib/db/locations';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getAuthenticatedAdminEmail } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const adminEmail = await getAuthenticatedAdminEmail(request);
    if (!adminEmail) {
      return apiError('Unauthorized', 403);
    }

    const metrics = await getCityMetrics();

    const citiesOver10 = metrics.filter((m) => m.visible_spots >= 10).length;

    return apiSuccess({ metrics, cities_with_10_plus_spots: citiesOver10 });
  } catch (error) {
    console.error('City metrics API error:', error);
    return apiError('Failed to fetch city metrics', 500);
  }
}

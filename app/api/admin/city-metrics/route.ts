import { NextRequest } from 'next/server';
import { checkAdminPermission } from '@/lib/db/admin';
import { getCityMetrics } from '@/lib/db/locations';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(request: NextRequest) {
  try {
    const adminEmail = request.headers.get('x-user-email') || undefined;
    if (!checkAdminPermission(adminEmail)) {
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

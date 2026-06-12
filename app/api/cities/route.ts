import { listActiveCities } from '@/lib/db/cities';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** GET /api/cities — public list of active cities (for filters/dropdowns) */
export async function GET() {
  try {
    const cities = await listActiveCities();
    const response = apiSuccess(cities);
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (e) {
    console.error('Failed to list cities:', e);
    return apiError('Failed to load cities', 500);
  }
}

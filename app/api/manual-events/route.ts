import { listManualEvents } from '@/lib/db/manual-events';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** GET /api/manual-events — public list of manual events */
export async function GET() {
  try {
    const events = await listManualEvents();
    const response = apiSuccess(events);
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (e) {
    console.error('Failed to list manual events:', e);
    return apiError('Failed to load events', 500);
  }
}

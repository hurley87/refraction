import { listManualEvents } from '@/lib/db/manual-events';
import { apiSuccess, apiError } from '@/lib/api/response';

/** GET /api/manual-events — public list of manual events */
export async function GET() {
  try {
    const events = await listManualEvents();
    return apiSuccess(events);
  } catch (e) {
    console.error('Failed to list manual events:', e);
    return apiError('Failed to load events', 500);
  }
}

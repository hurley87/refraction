import { apiSuccess, apiError } from '@/lib/api/response';
import { listFeaturedDiceEventIds } from '@/lib/db/featured-dice-event';

export const dynamic = 'force-dynamic';

/** GET /api/dice/featured — public list of homepage/events featured DICE ids. */
export async function GET() {
  try {
    const diceEventIds = await listFeaturedDiceEventIds();
    return apiSuccess({ diceEventIds });
  } catch (error) {
    console.error('Failed to list featured DICE events:', error);
    return apiError('Failed to load featured events', 500);
  }
}

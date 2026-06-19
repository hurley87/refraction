import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { getAuthenticatedAdminEmail } from '@/lib/auth';
import {
  getFeaturedDiceEventId,
  setFeaturedDiceEvent,
  clearFeaturedDiceEvent,
} from '@/lib/db/featured-dice-event';

const setFeaturedSchema = z.object({
  diceEventId: z.string().min(1, 'DICE event ID is required'),
});

/** GET /api/admin/dice/featured — current featured DICE event id (if any) */
export async function GET(request: NextRequest) {
  const admin = await getAuthenticatedAdminEmail(request);
  if (!admin) return apiError('Unauthorized', 403);

  try {
    const diceEventId = await getFeaturedDiceEventId();
    return apiSuccess({ diceEventId });
  } catch (e) {
    console.error('Failed to get featured DICE event:', e);
    return apiError('Failed to load featured DICE event', 500);
  }
}

/** POST /api/admin/dice/featured — set featured DICE event (clears manual featured) */
export async function POST(request: NextRequest) {
  const admin = await getAuthenticatedAdminEmail(request);
  if (!admin) return apiError('Unauthorized', 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', 400);
  }

  const parsed = setFeaturedSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error);

  try {
    await setFeaturedDiceEvent(parsed.data.diceEventId);
    revalidatePath('/');
    return apiSuccess({ diceEventId: parsed.data.diceEventId });
  } catch (e) {
    console.error('Failed to set featured DICE event:', e);
    return apiError('Failed to feature DICE event', 500);
  }
}

/** DELETE /api/admin/dice/featured — clear featured DICE event */
export async function DELETE(request: NextRequest) {
  const admin = await getAuthenticatedAdminEmail(request);
  if (!admin) return apiError('Unauthorized', 403);

  try {
    await clearFeaturedDiceEvent();
    revalidatePath('/');
    return apiSuccess({ cleared: true });
  } catch (e) {
    console.error('Failed to clear featured DICE event:', e);
    return apiError('Failed to clear featured DICE event', 500);
  }
}

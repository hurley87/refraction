import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { getAuthenticatedAdminEmail } from '@/lib/auth';
import {
  addFeaturedDiceEvent,
  HomepageFeaturedCapError,
  listFeaturedDiceEventIds,
  removeFeaturedDiceEvent,
} from '@/lib/db/featured-dice-event';

const diceEventIdSchema = z.object({
  diceEventId: z.string().min(1, 'DICE event ID is required'),
});

/** GET /api/admin/dice/featured — current featured DICE event ids */
export async function GET(request: NextRequest) {
  const admin = await getAuthenticatedAdminEmail(request);
  if (!admin) return apiError('Unauthorized', 403);

  try {
    const diceEventIds = await listFeaturedDiceEventIds();
    return apiSuccess({ diceEventIds });
  } catch (e) {
    console.error('Failed to get featured DICE events:', e);
    return apiError('Failed to load featured DICE events', 500);
  }
}

/** POST /api/admin/dice/featured — add a featured DICE event */
export async function POST(request: NextRequest) {
  const admin = await getAuthenticatedAdminEmail(request);
  if (!admin) return apiError('Unauthorized', 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', 400);
  }

  const parsed = diceEventIdSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error);

  try {
    await addFeaturedDiceEvent(parsed.data.diceEventId);
    revalidatePath('/');
    return apiSuccess({ diceEventId: parsed.data.diceEventId });
  } catch (e) {
    if (e instanceof HomepageFeaturedCapError) {
      return apiError(e.message, 409);
    }
    console.error('Failed to feature DICE event:', e);
    return apiError('Failed to feature DICE event', 500);
  }
}

/** DELETE /api/admin/dice/featured — remove one featured DICE event */
export async function DELETE(request: NextRequest) {
  const admin = await getAuthenticatedAdminEmail(request);
  if (!admin) return apiError('Unauthorized', 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', 400);
  }

  const parsed = diceEventIdSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error);

  try {
    await removeFeaturedDiceEvent(parsed.data.diceEventId);
    revalidatePath('/');
    return apiSuccess({ diceEventId: parsed.data.diceEventId });
  } catch (e) {
    console.error('Failed to remove featured DICE event:', e);
    return apiError('Failed to remove featured DICE event', 500);
  }
}

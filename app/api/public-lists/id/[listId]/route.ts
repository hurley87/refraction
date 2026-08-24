import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getPublicCustomListWithLocations } from '@/lib/db/player-custom-lists';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';

const listIdParamsSchema = z.object({
  listId: z.string().uuid(),
});

/** GET /api/public-lists/id/[listId] — one non-private custom list with locations. */
export async function GET(
  _request: NextRequest,
  { params }: { params: { listId: string } }
) {
  try {
    const parsed = listIdParamsSchema.safeParse(params);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const list = await getPublicCustomListWithLocations(parsed.data.listId);
    if (!list) {
      return apiError('List not found', 404);
    }

    return apiSuccess({ list });
  } catch (error) {
    console.error('Failed to fetch public list:', error);
    return apiError('Failed to fetch list', 500);
  }
}

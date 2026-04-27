import { NextRequest } from 'next/server';
import { getSpendItemById } from '@/lib/db/spend';
import { getSpendExperienceById } from '@/lib/db/spend-experiences';
import { apiSuccess, apiError } from '@/lib/api/response';

/**
 * GET /api/spend/[id]
 * Resolves a legacy spend item id vs a spend pilot experience id for `/spend/[id]`.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!id) {
    return apiError('Missing id', 400);
  }

  try {
    const experience = await getSpendExperienceById(id);
    if (experience) {
      return apiSuccess({
        kind: 'spend_experience' as const,
        spendExperience: experience,
      });
    }
  } catch (e) {
    console.error('getSpendExperienceById in /api/spend/[id]:', e);
  }

  try {
    const item = await getSpendItemById(id);
    return apiSuccess({ kind: 'spend_item' as const, item });
  } catch (error: unknown) {
    const anyErr = error as { code?: string };
    if (anyErr?.code === 'PGRST116') {
      return apiError('Not found', 404);
    }
    console.error('GET /api/spend/[id] spend item error:', error);
    return apiError('Failed to resolve spend route', 500);
  }
}

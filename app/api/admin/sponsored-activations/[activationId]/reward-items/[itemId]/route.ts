import { NextRequest } from 'next/server';
import {
  getActivationRewardItemById,
  updateActivationRewardItem,
} from '@/lib/db/activation-reward-items';
import { getSponsoredActivationById } from '@/lib/db/sponsored-activations';
import { updateActivationRewardItemSchema } from '@/lib/schemas/activation-reward-item';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth';

interface RouteParams {
  params: { activationId: string; itemId: string };
}

/** GET /api/admin/sponsored-activations/{activationId}/reward-items/{itemId} */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const activation = await getSponsoredActivationById(params.activationId);
    if (!activation) {
      return apiError('Sponsored activation not found', 404);
    }

    const item = await getActivationRewardItemById(
      params.activationId,
      params.itemId
    );
    if (!item) {
      return apiError('Reward item not found', 404);
    }

    return apiSuccess({ rewardItem: item });
  } catch (error) {
    console.error(
      'GET /api/admin/sponsored-activations/[activationId]/reward-items/[itemId]:',
      error
    );
    return apiError('Failed to load reward item', 500);
  }
}

/** PATCH /api/admin/sponsored-activations/{activationId}/reward-items/{itemId} */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const activation = await getSponsoredActivationById(params.activationId);
    if (!activation) {
      return apiError('Sponsored activation not found', 404);
    }

    const existing = await getActivationRewardItemById(
      params.activationId,
      params.itemId
    );
    if (!existing) {
      return apiError('Reward item not found', 404);
    }

    const raw = await request.json();
    const validation = updateActivationRewardItemSchema.safeParse(raw);
    if (!validation.success) {
      return apiValidationError(validation.error);
    }
    const v = validation.data;

    const patch: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(v)) {
      if (val !== undefined) {
        patch[key] = val;
      }
    }

    const updated = await updateActivationRewardItem(
      params.activationId,
      params.itemId,
      patch
    );
    if (!updated) {
      return apiError('Reward item not found', 404);
    }

    return apiSuccess({ rewardItem: updated });
  } catch (error) {
    console.error(
      'PATCH /api/admin/sponsored-activations/[activationId]/reward-items/[itemId]:',
      error
    );
    return apiError('Failed to update reward item', 500);
  }
}

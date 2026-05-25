import { NextRequest } from 'next/server';
import {
  createActivationRewardItem,
  listActivationRewardItems,
} from '@/lib/db/activation-reward-items';
import { getSponsoredActivationById } from '@/lib/db/sponsored-activations';
import { createActivationRewardItemSchema } from '@/lib/schemas/activation-reward-item';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth';

interface RouteParams {
  params: { activationId: string };
}

/** GET /api/admin/sponsored-activations/{activationId}/reward-items */
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

    const items = await listActivationRewardItems(params.activationId);
    return apiSuccess({ rewardItems: items });
  } catch (error) {
    console.error(
      'GET /api/admin/sponsored-activations/[activationId]/reward-items:',
      error
    );
    return apiError('Failed to list reward items', 500);
  }
}

/** POST /api/admin/sponsored-activations/{activationId}/reward-items */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const activation = await getSponsoredActivationById(params.activationId);
    if (!activation) {
      return apiError('Sponsored activation not found', 404);
    }

    const body = await request.json();
    const validation = createActivationRewardItemSchema.safeParse(body);
    if (!validation.success) {
      return apiValidationError(validation.error);
    }
    const data = validation.data;

    const row = await createActivationRewardItem({
      activation_id: activation.id,
      name: data.name,
      hero_image_url: data.hero_image_url,
      description: data.description,
      points_cost: data.points_cost,
      usdc_amount: data.usdc_amount,
      sort_order: data.sort_order,
      is_active: data.is_active,
      max_per_user: data.max_per_user,
    });

    return apiSuccess({ rewardItem: row }, 'Reward item created successfully');
  } catch (error) {
    console.error(
      'POST /api/admin/sponsored-activations/[activationId]/reward-items:',
      error
    );
    return apiError('Failed to create reward item', 500);
  }
}

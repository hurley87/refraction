import { NextRequest } from 'next/server';
import { listActivationRewardItems } from '@/lib/db/activation-reward-items';
import { getSponsoredActivationByIdOrSlug } from '@/lib/db/sponsored-activations';
import { apiError, apiSuccess } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

type RouteParams = { params: { activationId: string } };

/**
 * GET /api/sponsored-activations/{activationIdOrSlug}
 * Public read: activation display fields + first active reward item (sanitized).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const activationKey = params.activationId?.trim();
  if (!activationKey) {
    return apiError('Missing activation id or slug', 400);
  }

  const activation = await getSponsoredActivationByIdOrSlug(activationKey);
  if (!activation) {
    return apiError('Sponsored activation not found', 404);
  }

  let items;
  try {
    items = await listActivationRewardItems(activation.id);
  } catch (e) {
    console.error('GET sponsored activation (reward items):', e);
    return apiError('Something went wrong', 500);
  }

  const active = items
    .filter((i) => i.is_active)
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.created_at.localeCompare(b.created_at);
    });

  const reward = active[0];
  if (!reward) {
    return apiError('Sponsored activation not found', 404);
  }

  return apiSuccess({
    activation: {
      title: activation.title,
      sponsor_name: activation.sponsor_name,
      slug: activation.slug,
      status: activation.status,
      window: {
        starts_at: activation.starts_at,
        ends_at: activation.ends_at,
      },
    },
    rewardItem: {
      id: reward.id,
      name: reward.name,
      hero_image_url: reward.hero_image_url,
      description: reward.description,
      points_cost: reward.points_cost,
    },
  });
}

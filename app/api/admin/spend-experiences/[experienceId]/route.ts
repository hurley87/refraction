import { NextRequest } from 'next/server';
import {
  getSpendExperienceById,
  updateSpendExperience,
} from '@/lib/db/spend-experiences';
import { z } from 'zod';
import { updateSpendExperienceRequestSchema } from '@/lib/schemas/spend-experience';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth';
import { getServerWalletFundingStatus } from '@/lib/spend-server-wallet';
import {
  getSpendTreasuryWalletAddress,
  assertSpendRailAllowsMutatingSpendWork,
} from '@/lib/spend-rail-config';
import { trackSpendPilotRailMutationBlocked } from '@/lib/analytics/server';
import { spendPilotRailMixpanelFields } from '@/lib/analytics/spend-pilot-rail-context';

interface RouteParams {
  params: { experienceId: string };
}

type UpdateSpendExperiencePatch = z.infer<
  typeof updateSpendExperienceRequestSchema
>;

function spendExperiencePatchAffectsSpendMechanics(
  data: UpdateSpendExperiencePatch
): boolean {
  return (
    data.status !== undefined ||
    data.max_usdc_per_user !== undefined ||
    data.points_to_usdc_rate !== undefined ||
    data.start_time !== undefined ||
    data.end_time !== undefined
  );
}

/** GET /api/admin/spend-experiences/{experienceId} */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const adminCheck = await requireAdmin(_request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const existing = await getSpendExperienceById(params.experienceId);
    if (!existing) {
      return apiError('Spend experience not found', 404);
    }

    return apiSuccess({ spendExperience: existing });
  } catch (error) {
    console.error('Error fetching spend experience:', error);
    return apiError('Failed to fetch spend experience', 500);
  }
}

/** PATCH /api/admin/spend-experiences/{experienceId} */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const existing = await getSpendExperienceById(params.experienceId);
    if (!existing) {
      return apiError('Spend experience not found', 404);
    }

    const raw = await request.json();
    const validation = updateSpendExperienceRequestSchema.safeParse(raw);
    if (!validation.success) {
      return apiValidationError(validation.error);
    }

    if (spendExperiencePatchAffectsSpendMechanics(validation.data)) {
      const railGate = assertSpendRailAllowsMutatingSpendWork(
        existing.spend_rail
      );
      if (!railGate.ok) {
        trackSpendPilotRailMutationBlocked(
          adminCheck.user?.email ?? 'admin_server',
          {
            mutation: 'admin_spend_experience_update',
            ...railGate.analytics,
            ...spendPilotRailMixpanelFields(existing.spend_rail),
            spend_experience_id: existing.id,
            event_id: existing.event_id,
            admin_actor: adminCheck.user?.email ?? null,
          }
        );
        return apiError(railGate.error, 400);
      }
    }

    const nextStart = validation.data.start_time ?? existing.start_time;
    const nextEnd = validation.data.end_time ?? existing.end_time;
    if (new Date(nextEnd) <= new Date(nextStart)) {
      return apiError('end_time must be after start_time', 400);
    }

    if (validation.data.status === 'active') {
      if (existing.spend_rail === 'base_usdc') {
        const funding = await getServerWalletFundingStatus({
          walletAddress: getSpendTreasuryWalletAddress('base_usdc'),
          minUsdcRequired:
            validation.data.max_usdc_per_user ?? existing.max_usdc_per_user,
        });
        if (!funding.isFunded) {
          return apiError(
            'Server wallet must be funded with at least max_usdc_per_user USDC before activation.',
            400
          );
        }
      }
    }

    const spendExperience = await updateSpendExperience(
      params.experienceId,
      validation.data,
      existing.spend_rail
    );

    return apiSuccess(
      { spendExperience },
      'Spend experience updated successfully'
    );
  } catch (error) {
    console.error('Error updating spend experience:', error);
    return apiError('Failed to update spend experience', 500);
  }
}

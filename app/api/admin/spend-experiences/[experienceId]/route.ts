import { NextRequest } from 'next/server';
import {
  getSpendExperienceById,
  updateSpendExperience,
} from '@/lib/db/spend-experiences';
import { updateSpendExperienceRequestSchema } from '@/lib/schemas/spend-experience';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth';

interface RouteParams {
  params: { experienceId: string };
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

    const nextStart = validation.data.start_time ?? existing.start_time;
    const nextEnd = validation.data.end_time ?? existing.end_time;
    if (new Date(nextEnd) <= new Date(nextStart)) {
      return apiError('end_time must be after start_time', 400);
    }

    const spendExperience = await updateSpendExperience(
      params.experienceId,
      validation.data
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

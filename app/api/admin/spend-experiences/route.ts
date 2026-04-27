import { NextRequest } from 'next/server';
import {
  createSpendExperience,
  listSpendExperiences,
} from '@/lib/db/spend-experiences';
import { createSpendExperienceRequestSchema } from '@/lib/schemas/spend-experience';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth';

/** GET /api/admin/spend-experiences */
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const spendExperiences = await listSpendExperiences();
    return apiSuccess({ spendExperiences });
  } catch (error) {
    console.error('Error listing spend experiences:', error);
    return apiError('Failed to fetch spend experiences', 500);
  }
}

/** POST /api/admin/spend-experiences */
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const body = await request.json();
    const validation = createSpendExperienceRequestSchema.safeParse(body);
    if (!validation.success) {
      return apiValidationError(validation.error);
    }

    const adminEmail = adminCheck.user?.email || undefined;
    const spendExperience = await createSpendExperience({
      ...validation.data,
      created_by: adminEmail ?? null,
    });

    return apiSuccess(
      { spendExperience },
      'Spend experience created successfully'
    );
  } catch (error) {
    console.error('Error creating spend experience:', error);
    return apiError('Failed to create spend experience', 500);
  }
}

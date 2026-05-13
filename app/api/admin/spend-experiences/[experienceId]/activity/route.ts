import { NextRequest } from 'next/server';
import { getSpendExperienceById } from '@/lib/db/spend-experiences';
import {
  getSpendPilotAdminTotals,
  getSpendPilotAdminRailVisibility,
  listSpendPilotActivityForExperience,
} from '@/lib/db/spend-admin';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth';

interface RouteParams {
  params: { experienceId: string };
}

/**
 * GET /api/admin/spend-experiences/{experienceId}/activity
 * Sessions (recent), failed conversion/payment rows, and aggregate totals (PRD §12).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const adminCheck = await requireAdmin(_request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const experience = await getSpendExperienceById(params.experienceId);
    if (!experience) {
      return apiError('Spend experience not found', 404);
    }

    const [totals, activity, railVisibility] = await Promise.all([
      getSpendPilotAdminTotals(experience.id),
      listSpendPilotActivityForExperience(experience.id),
      getSpendPilotAdminRailVisibility(experience.id),
    ]);

    const mixpanelProjectId = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN?.trim();
    const mixpanelInsightUrl = mixpanelProjectId
      ? `https://mixpanel.com/project/${encodeURIComponent(mixpanelProjectId)}/view/events`
      : undefined;

    return apiSuccess({
      spendExperienceId: experience.id,
      totals,
      sessions: activity.sessions,
      failedConversions: activity.failedConversions,
      failedPayments: activity.failedPayments,
      railVisibility,
      mixpanelInsightUrl,
    });
  } catch (error) {
    console.error('admin spend activity:', error);
    return apiError('Failed to load spend activity', 500);
  }
}

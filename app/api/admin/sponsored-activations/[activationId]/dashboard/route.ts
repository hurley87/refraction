import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth';
import { sponsoredActivationAdminEnvelope } from '@/lib/activation/explorer-url';
import { loadSponsoredActivationAdminDashboard } from '@/lib/db/sponsored-activation-admin';

interface RouteParams {
  params: { activationId: string };
}

/** GET /api/admin/sponsored-activations/{activationId}/dashboard */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const key = params.activationId;
    if (!key?.trim()) {
      return apiError('Missing activation id', 400);
    }

    const bundle = await loadSponsoredActivationAdminDashboard(key);
    if (!bundle) {
      return apiError('Sponsored activation not found', 404);
    }

    const { activation, ...rest } = bundle;
    return apiSuccess({
      activation: sponsoredActivationAdminEnvelope(activation),
      ...rest,
    });
  } catch (error) {
    console.error(
      'GET /api/admin/sponsored-activations/[activationId]/dashboard:',
      error
    );
    return apiError('Failed to load sponsored activation dashboard', 500);
  }
}

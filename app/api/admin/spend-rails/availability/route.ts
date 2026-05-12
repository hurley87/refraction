import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth';
import { buildSpendRailsAvailabilityClientPayload } from '@/lib/admin/spend-rail-availability-public';

/** GET /api/admin/spend-rails/availability — per-rail operational status for admin UI (browser-safe). */
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    return apiSuccess(buildSpendRailsAvailabilityClientPayload());
  } catch (error) {
    console.error('admin spend rails availability:', error);
    return apiError('Failed to load spend rail availability', 500);
  }
}

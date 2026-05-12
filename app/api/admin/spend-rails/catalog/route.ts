import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api/response';
import { listSpendRailCatalog } from '@/lib/spend-rail-config';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/spend-rails/catalog
 * Public (non-secret) rail metadata for admin pickers and read-only wallet display.
 */
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    return apiSuccess({ rails: listSpendRailCatalog() });
  } catch (error) {
    console.error('GET spend rails catalog:', error);
    return apiError('Failed to load spend rail catalog', 500);
  }
}

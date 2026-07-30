import { NextRequest } from 'next/server';
import { listCountries } from '@/lib/db/countries';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/countries — ISO countries for location dropdowns.
 */
export async function GET(_request: NextRequest) {
  try {
    const countries = await listCountries();
    return apiSuccess({ countries });
  } catch (error) {
    console.error('Error listing countries:', error);
    return apiError('Failed to list countries', 500);
  }
}

import { NextRequest } from 'next/server';
import { checkAdminPermission } from '@/lib/db/admin';
import { getCityMetrics } from '@/lib/db/locations';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getPrivyClient } from '@/lib/api/privy';

async function getAuthenticatedAdminEmail(
  request: NextRequest
): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  try {
    const privy = getPrivyClient();
    const verifiedClaims = await privy.verifyAuthToken(token);
    const user = await privy.getUser(verifiedClaims.userId);
    const email = user.email?.address?.trim().toLowerCase();
    if (!email) return null;
    return checkAdminPermission(email) ? email : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const adminEmail = await getAuthenticatedAdminEmail(request);
    if (!adminEmail) {
      return apiError('Unauthorized', 403);
    }

    const metrics = await getCityMetrics();

    const citiesOver10 = metrics.filter((m) => m.visible_spots >= 10).length;

    return apiSuccess({ metrics, cities_with_10_plus_spots: citiesOver10 });
  } catch (error) {
    console.error('City metrics API error:', error);
    return apiError('Failed to fetch city metrics', 500);
  }
}

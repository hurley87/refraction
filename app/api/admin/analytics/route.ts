import { NextRequest } from 'next/server';
import { checkAdminPermission } from '@/lib/db/admin';
import {
  getAnalyticsSummary,
  getAnalyticsTimeSeries,
  getRecentSignups,
  getRecentCheckins,
  getTopLocations,
} from '@/lib/db/analytics';
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

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') ?? undefined;
    const to = searchParams.get('to') ?? undefined;

    const [summary, timeSeries, recentSignups, recentCheckins, topLocations] =
      await Promise.all([
        getAnalyticsSummary(),
        getAnalyticsTimeSeries(from, to),
        getRecentSignups(25),
        getRecentCheckins(25),
        getTopLocations(20),
      ]);

    return apiSuccess({
      summary,
      timeSeries,
      recentSignups,
      recentCheckins,
      topLocations,
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return apiError('Failed to fetch analytics data', 500);
  }
}

import { NextRequest } from 'next/server';
import { getPrivyUserIdFromRequest } from '@/lib/api/privy';
import {
  getSpendSessionById,
  getPointConversionBySessionId,
} from '@/lib/db/spend-sessions';
import { getSpendExperienceById } from '@/lib/db/spend-experiences';
import { apiSuccess, apiError } from '@/lib/api/response';
import { maybeReconcileSpendRailOnAuthorizedSessionRead } from '@/lib/spend/opportunistic-spend-rail-reconcile-on-read';

export const dynamic = 'force-dynamic';

type RouteParams = { params: { sessionId: string } };

/**
 * GET /api/spend-sessions/{sessionId}
 * Returns session with spend experience summary (authorized Privy user must own the session).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const sessionId = params.sessionId;
  if (!sessionId) {
    return apiError('Missing session id', 400);
  }

  const userId = await getPrivyUserIdFromRequest(_request);
  if (!userId) {
    return apiError('Unauthorized', 401);
  }

  const session = await getSpendSessionById(sessionId);
  if (!session) {
    return apiError('Spend session not found', 404);
  }

  if (session.user_id !== userId) {
    return apiError('Forbidden', 403);
  }

  await maybeReconcileSpendRailOnAuthorizedSessionRead({
    spendSessionId: sessionId,
    session,
  });

  const refreshed = await getSpendSessionById(sessionId);
  if (!refreshed) {
    return apiError('Spend session not found', 404);
  }

  const [spendExperience, pointConversion] = await Promise.all([
    getSpendExperienceById(refreshed.spend_experience_id),
    getPointConversionBySessionId(sessionId),
  ]);

  return apiSuccess({
    session: refreshed,
    spendExperience,
    pointConversion,
  });
}

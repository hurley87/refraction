import { NextRequest } from 'next/server';
import { getPrivyUserIdFromRequest } from '@/lib/api/privy';
import {
  getSpendSessionById,
  getPointConversionBySessionId,
  getSpendTransactionBySessionId,
} from '@/lib/db/spend-sessions';
import { getSpendExperienceById } from '@/lib/db/spend-experiences';
import { apiSuccess, apiError } from '@/lib/api/response';
import { loadSpendEligibilityForSession } from '@/lib/spend-conversion-preview';
import {
  resolveServerIdentity,
  trackSpendReceiptViewed,
} from '@/lib/analytics/server';

export const dynamic = 'force-dynamic';

type RouteParams = { params: { sessionId: string } };

/**
 * GET /api/spend-sessions/{sessionId}/receipt
 * Partial receipt / status: session, experience, conversion, and server-computed eligibility.
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

  const [spendExperience, pointConversion, spendTransaction] =
    await Promise.all([
      getSpendExperienceById(session.spend_experience_id),
      getPointConversionBySessionId(sessionId),
      getSpendTransactionBySessionId(sessionId),
    ]);

  if (!spendExperience) {
    return apiError('Spend experience not found', 404);
  }

  try {
    const eligibility = await loadSpendEligibilityForSession({
      session,
      spendExperience,
    });

    const distinctId = resolveServerIdentity({
      privyUserId: userId,
      walletAddress: session.wallet_address.toLowerCase(),
    });
    trackSpendReceiptViewed(distinctId, {
      spend_experience_id: spendExperience.id,
      event_id: spendExperience.event_id,
      user_id: userId,
      wallet_address: session.wallet_address.toLowerCase(),
      points_amount: pointConversion?.points_deducted ?? 0,
      usdc_amount: pointConversion?.usdc_amount ?? 0,
      status: session.status,
      spend_session_id: session.id,
      point_conversion_id: pointConversion?.id,
      spend_transaction_id: spendTransaction?.id,
      payment_tx_hash: spendTransaction?.payment_tx_hash ?? null,
    });

    return apiSuccess({
      session,
      spendExperience,
      pointConversion,
      spendTransaction,
      eligibility,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load receipt state';
    console.error('GET spend receipt:', e);
    return apiError(msg, 500);
  }
}

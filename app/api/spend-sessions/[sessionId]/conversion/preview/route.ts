import { NextRequest } from 'next/server';
import {
  getPrivyUserIdFromRequest,
  verifyWalletOwnership,
} from '@/lib/api/privy';
import { getSpendSessionById } from '@/lib/db/spend-sessions';
import { getSpendExperienceById } from '@/lib/db/spend-experiences';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import {
  computeConversionAmounts,
  loadSpendEligibilityForSession,
} from '@/lib/spend-conversion-preview';
import {
  trackSpendConversionPreviewed,
  trackSpendTreasuryInsufficientFunds,
  trackSpendUserAlreadyConverted,
  resolveServerIdentity,
} from '@/lib/analytics/server';
import { spendConversionPreviewBodySchema } from '@/lib/schemas/spend-session';

export const dynamic = 'force-dynamic';

type RouteParams = { params: { sessionId: string } };

/**
 * POST /api/spend-sessions/{sessionId}/conversion/preview
 * Server-side eligibility and conversion amounts (Privy + wallet ownership).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const sessionId = params.sessionId;
  if (!sessionId) {
    return apiError('Missing session id', 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  const parsed = spendConversionPreviewBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const walletAddress = parsed.data.walletAddress.trim();
  const normalizedWallet = walletAddress.toLowerCase();

  const auth = await verifyWalletOwnership(request, walletAddress);
  if (!auth.authorized || !auth.userId) {
    return apiError(auth.error ?? 'Unauthorized', 401);
  }

  const tokenUser = await getPrivyUserIdFromRequest(request);
  if (!tokenUser || tokenUser !== auth.userId) {
    return apiError('Unauthorized', 401);
  }

  const session = await getSpendSessionById(sessionId);
  if (!session) {
    return apiError('Spend session not found', 404);
  }

  if (session.user_id !== auth.userId) {
    return apiError('Forbidden', 403);
  }

  if (session.wallet_address.toLowerCase() !== normalizedWallet) {
    return apiError('Wallet does not match this session', 400);
  }

  const spendExperience = await getSpendExperienceById(
    session.spend_experience_id
  );
  if (!spendExperience) {
    return apiError('Spend experience not found', 404);
  }

  const distinctId = resolveServerIdentity({
    privyUserId: auth.userId,
    walletAddress: normalizedWallet,
  });

  const { usdcAmount, pointsRequired } =
    computeConversionAmounts(spendExperience);

  try {
    const eligibility = await loadSpendEligibilityForSession({
      session,
      spendExperience,
    });

    const baseProps = {
      spend_experience_id: spendExperience.id,
      event_id: spendExperience.event_id,
      user_id: auth.userId,
      wallet_address: normalizedWallet,
      points_amount: pointsRequired,
      usdc_amount: usdcAmount,
      status: eligibility.status,
      error_reason:
        eligibility.status === 'eligible' ? undefined : eligibility.status,
    };

    trackSpendConversionPreviewed(distinctId, baseProps);

    if (eligibility.status === 'already_converted') {
      trackSpendUserAlreadyConverted(distinctId, baseProps);
    }
    if (eligibility.status === 'treasury_insufficient') {
      trackSpendTreasuryInsufficientFunds(distinctId, baseProps);
    }

    return apiSuccess({
      eligibility,
      spendExperience,
      session: {
        id: session.id,
        status: session.status,
        expires_at: session.expires_at,
      },
    });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : 'Failed to compute conversion preview';
    console.error('POST conversion preview:', e);
    return apiError(msg, 500);
  }
}

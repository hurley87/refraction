import { NextRequest } from 'next/server';
import {
  getPrivyUserIdFromRequest,
  verifyWalletOwnership,
} from '@/lib/api/privy';
import { apiError, apiSuccess, apiValidationError } from '@/lib/api/response';
import { resolveServerIdentity } from '@/lib/analytics/server';
import {
  getSpendPaymentPrepareContextOr404,
  runSpendPaymentPrepare,
} from '@/lib/spend-payment-prepare';
import { spendPaymentPrepareBodySchema } from '@/lib/schemas/spend-session';
import { getSpendRailClientSummary } from '@/lib/spend-rail-config';

export const dynamic = 'force-dynamic';

type RouteParams = { params: { sessionId: string } };

/**
 * POST /api/spend-sessions/{sessionId}/payment/prepare
 * Returns a JSON-serializable Privy-compatible EVM transaction request for Base USDC transfer.
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

  const parsed = spendPaymentPrepareBodySchema.safeParse(body);
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

  const ctx = await getSpendPaymentPrepareContextOr404(sessionId);
  if ('error' in ctx) {
    return apiError(ctx.error, ctx.httpStatus);
  }

  const { session, spendExperience } = ctx;

  const distinctId = resolveServerIdentity({
    privyUserId: auth.userId,
    walletAddress: normalizedWallet,
  });

  try {
    const result = await runSpendPaymentPrepare({
      session,
      spendExperience,
      normalizedWallet,
      authUserId: auth.userId,
      distinctId,
    });

    if (!result.ok) {
      return apiError(result.error, result.httpStatus, result.details);
    }

    return apiSuccess({
      preparedAction: result.preparedAction,
      spendRailSummary: getSpendRailClientSummary(session.spend_rail),
      session: result.session,
      paymentOperation: result.paymentOperation,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to prepare payment';
    console.error('POST payment prepare:', e);
    return apiError(msg, 500);
  }
}

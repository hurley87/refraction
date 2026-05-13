import { NextRequest } from 'next/server';
import {
  getPrivyUserIdFromRequest,
  verifyWalletOwnership,
} from '@/lib/api/privy';
import { apiError, apiSuccess, apiValidationError } from '@/lib/api/response';
import { resolveServerIdentity } from '@/lib/analytics/server';
import {
  getSpendPaymentContextOr404,
  runSpendPaymentConfirm,
} from '@/lib/spend-payment-confirm';
import { spendPaymentConfirmBodySchema } from '@/lib/schemas/spend-session';
import { getSpendRailClientSummary } from '@/lib/spend-rail-config';

export const dynamic = 'force-dynamic';

type RouteParams = { params: { sessionId: string } };

/**
 * POST /api/spend-sessions/{sessionId}/payment/confirm
 * Verifies on-chain USDC transfer from the session wallet to the configured receiving wallet for the session rail.
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

  const parsed = spendPaymentConfirmBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const walletAddress = parsed.data.walletAddress.trim();
  const normalizedWallet = walletAddress.toLowerCase();
  const paymentTxHash = parsed.data.paymentTxHash.trim();

  const auth = await verifyWalletOwnership(request, walletAddress);
  if (!auth.authorized || !auth.userId) {
    return apiError(auth.error ?? 'Unauthorized', 401);
  }

  const tokenUser = await getPrivyUserIdFromRequest(request);
  if (!tokenUser || tokenUser !== auth.userId) {
    return apiError('Unauthorized', 401);
  }

  const ctx = await getSpendPaymentContextOr404(sessionId);
  if ('error' in ctx) {
    return apiError(ctx.error, ctx.httpStatus);
  }

  const { session, spendExperience, usdcAmount } = ctx;

  const distinctId = resolveServerIdentity({
    privyUserId: auth.userId,
    walletAddress: normalizedWallet,
  });

  try {
    const result = await runSpendPaymentConfirm({
      session,
      spendExperience,
      normalizedWallet,
      authUserId: auth.userId,
      distinctId,
      paymentTxHash,
      usdcAmount,
    });

    if (!result.ok) {
      return apiError(result.error, result.httpStatus, result.details);
    }

    return apiSuccess({
      spendTransaction: result.spendTransaction,
      spendRailSummary: getSpendRailClientSummary(session.spend_rail),
      session: {
        id: result.session.id,
        status: result.session.status,
        expires_at: result.session.expires_at,
        completed_at: result.session.completed_at,
      },
      resumed: result.resumed,
      paymentOperation: result.paymentOperation,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to confirm payment';
    console.error('POST payment confirm:', e);
    return apiError(msg, 500);
  }
}

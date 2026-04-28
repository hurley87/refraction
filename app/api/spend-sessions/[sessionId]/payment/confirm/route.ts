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

export const dynamic = 'force-dynamic';

type RouteParams = { params: { sessionId: string } };

/**
 * POST /api/spend-sessions/{sessionId}/payment/confirm
 * Verifies on-chain Base USDC transfer from the session wallet to the experience receiving wallet.
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

  if (session.user_id !== auth.userId) {
    return apiError('Forbidden', 403);
  }

  if (session.wallet_address.toLowerCase() !== normalizedWallet) {
    return apiError('Wallet does not match this session', 400);
  }

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
      return apiError(result.error, result.httpStatus);
    }

    return apiSuccess({
      spendTransaction: result.spendTransaction,
      session: {
        id: result.session.id,
        status: result.session.status,
        expires_at: result.session.expires_at,
        completed_at: result.session.completed_at,
      },
      resumed: result.resumed,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to confirm payment';
    console.error('POST payment confirm:', e);
    return apiError(msg, 500);
  }
}

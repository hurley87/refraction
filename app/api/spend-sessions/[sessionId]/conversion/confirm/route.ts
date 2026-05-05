import { NextRequest } from 'next/server';
import {
  getPrivyUserIdFromRequest,
  verifyWalletOwnership,
} from '@/lib/api/privy';
import { apiError, apiSuccess, apiValidationError } from '@/lib/api/response';
import { captureHandledException } from '@/lib/monitoring/capture-handled-exception';
import { resolveServerIdentity } from '@/lib/analytics/server';
import {
  getSpendContextOr404,
  runSpendConversionConfirm,
} from '@/lib/spend-conversion-confirm';
import { spendConversionConfirmBodySchema } from '@/lib/schemas/spend-session';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteParams = { params: { sessionId: string } };

/**
 * POST /api/spend-sessions/{sessionId}/conversion/confirm
 * Atomically deducts points, creates point conversion, sends treasury USDC to the user wallet (PRD §11).
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

  const parsed = spendConversionConfirmBodySchema.safeParse(body);
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

  const ctx = await getSpendContextOr404(sessionId);
  if ('error' in ctx) {
    return apiError(ctx.error.error, ctx.error.httpStatus);
  }

  const { session, spendExperience, usdcAmount, pointsRequired } = ctx;

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
    const result = await runSpendConversionConfirm({
      session,
      spendExperience,
      normalizedWallet,
      authUserId: auth.userId,
      distinctId,
      usdcAmount,
      pointsRequired,
    });

    if (!result.ok) {
      if (result.capture) {
        captureHandledException(new Error(result.error), {
          route: '/api/spend-sessions/[sessionId]/conversion/confirm',
          operation: 'spend_conversion_confirm',
          statusCode: result.httpStatus,
          extra: {
            sessionId,
            spendExperienceId: spendExperience.id,
            userId: auth.userId,
            walletAddressSuffix: normalizedWallet.slice(-8),
          },
        });
      }

      return apiError(result.error, result.httpStatus);
    }

    return apiSuccess({
      pointConversion: result.pointConversion,
      session: {
        id: result.session.id,
        status: result.session.status,
        expires_at: result.session.expires_at,
      },
      spendExperience: {
        id: spendExperience.id,
        title: spendExperience.title,
        pointsRequired,
        usdcAmount,
      },
      resumed: result.resumed,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to confirm conversion';
    console.error('POST conversion confirm:', e);
    return apiError(msg, 500);
  }
}

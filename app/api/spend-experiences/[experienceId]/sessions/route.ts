import { NextRequest } from 'next/server';
import {
  getPrivyUserIdFromRequest,
  verifyWalletOwnership,
} from '@/lib/api/privy';
import { getSpendExperienceById } from '@/lib/db/spend-experiences';
import { createOrGetSpendSession } from '@/lib/db/spend-sessions';
import { assertSpendExperienceOpenForSessions } from '@/lib/spend-experience-guard';
import { assertSpendRailAllowsMutatingSpendWork } from '@/lib/spend-rail-config';
import { createSpendSessionBodySchema } from '@/lib/schemas/spend-session';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { getSpendRailClientSummary } from '@/lib/spend-rail-config';
import {
  trackSpendPilotRailMutationBlocked,
  trackSpendSessionCreated,
  resolveServerIdentity,
} from '@/lib/analytics/server';

export const dynamic = 'force-dynamic';

type RouteParams = { params: { experienceId: string } };

/**
 * POST /api/spend-experiences/{experienceId}/sessions
 * Creates or returns a user-specific spend session (Privy + wallet ownership).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const experienceId = params.experienceId;
  if (!experienceId) {
    return apiError('Missing experience id', 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  const parsed = createSpendSessionBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const { walletAddress } = parsed.data;
  const auth = await verifyWalletOwnership(request, walletAddress);
  if (!auth.authorized || !auth.userId) {
    return apiError(auth.error ?? 'Unauthorized', 401);
  }

  const tokenUser = await getPrivyUserIdFromRequest(request);
  if (!tokenUser || tokenUser !== auth.userId) {
    return apiError('Unauthorized', 401);
  }

  const experience = await getSpendExperienceById(experienceId);
  if (!experience) {
    return apiError('Spend experience not found', 404);
  }

  const gate = assertSpendExperienceOpenForSessions(experience);
  if (!gate.ok) {
    return apiError(gate.error, gate.httpStatus);
  }

  const railGate = assertSpendRailAllowsMutatingSpendWork(
    experience.spend_rail
  );
  if (!railGate.ok) {
    const distinctId = resolveServerIdentity({
      privyUserId: auth.userId,
      walletAddress: walletAddress.trim().toLowerCase(),
    });
    trackSpendPilotRailMutationBlocked(distinctId, {
      mutation: 'spend_session_create',
      ...railGate.analytics,
      spend_experience_id: experienceId,
      event_id: experience.event_id,
      user_id: auth.userId,
      wallet_address: walletAddress.trim().toLowerCase(),
    });
    return apiError(railGate.error, 400);
  }

  try {
    const trimmedWallet = walletAddress.trim();
    const railUserWalletAddress =
      experience.spend_rail === 'stellar_usdc' ? null : trimmedWallet;

    const { session, created } = await createOrGetSpendSession({
      spendExperience: experience,
      userId: auth.userId,
      walletAddress: trimmedWallet,
      railUserWalletAddress,
    });

    if (created) {
      const distinctId = resolveServerIdentity({
        privyUserId: auth.userId,
        walletAddress: trimmedWallet.toLowerCase(),
      });
      trackSpendSessionCreated(distinctId, {
        spend_experience_id: experienceId,
        event_id: experience.event_id,
        user_id: auth.userId,
        wallet_address: trimmedWallet.toLowerCase(),
        spend_session_id: session.id,
        created: true,
      });
    }

    return apiSuccess(
      {
        session,
        spendExperience: experience,
        created,
        spendRailSummary: getSpendRailClientSummary(experience.spend_rail),
      },
      created ? 'Spend session created' : 'Spend session returned'
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to create session';
    console.error('POST spend session:', e);
    return apiError(msg, 500);
  }
}

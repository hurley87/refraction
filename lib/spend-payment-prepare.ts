import { getSpendExperienceById } from '@/lib/db/spend-experiences';
import {
  getPointConversionBySessionId,
  getSpendSessionById,
} from '@/lib/db/spend-sessions';
import {
  insertSpendPaymentPrepareOrGet,
  updateSpendPaymentPreparePayload,
} from '@/lib/db/spend-payment-prepare';
import {
  computeConversionAmounts,
  fetchUserUsdcBalanceSafe,
} from '@/lib/spend-conversion-preview';
import { assertSpendExperienceOpenForSessions } from '@/lib/spend-experience-guard';
import { getSpendPaymentRail } from '@/lib/spend/payment-rails';
import {
  assertSpendRailAllowsMutatingSpendWork,
  getSpendRailBaseUsdcContractAddress,
  getSpendReceivingWalletAddress,
} from '@/lib/spend-rail-config';
import { spendBaseUsdcSnapshotMatchesLiveRail } from '@/lib/spend-payment-prepare-types';
import {
  isEvmAddress,
  POSTER_CHECKOUT_CHAIN_ID,
} from '@/lib/walletconnect-poster-direct-usdc';
import { trackSpendPilotRailMutationBlocked } from '@/lib/analytics/server';
import type { SpendExperience, SpendSession } from '@/lib/types';

export type SpendPilotApiHttpStatus = 400 | 401 | 403 | 404 | 409 | 429 | 500;

export async function getSpendPaymentPrepareContextOr404(
  sessionId: string
): Promise<
  | {
      session: SpendSession;
      spendExperience: SpendExperience;
      usdcAmount: number;
    }
  | { error: string; httpStatus: SpendPilotApiHttpStatus }
> {
  const session = await getSpendSessionById(sessionId);
  if (!session) {
    return { error: 'Spend session not found', httpStatus: 404 };
  }
  const spendExperience = await getSpendExperienceById(
    session.spend_experience_id
  );
  if (!spendExperience) {
    return { error: 'Spend experience not found', httpStatus: 404 };
  }
  const { usdcAmount } = computeConversionAmounts(spendExperience);
  return { session, spendExperience, usdcAmount };
}

export type SpendPaymentPrepareResult =
  | {
      ok: true;
      preparedAction: Record<string, unknown>;
      session: Pick<SpendSession, 'id' | 'status' | 'expires_at'>;
    }
  | { ok: false; error: string; httpStatus: SpendPilotApiHttpStatus };

function snapshotsContentEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Validates session + wallet gates, persists idempotent prepare (Base USDC), and returns
 * the JSON-serializable prepared action for the client.
 */
export async function runSpendPaymentPrepare(input: {
  session: SpendSession;
  spendExperience: SpendExperience;
  normalizedWallet: string;
  authUserId: string;
  distinctId: string;
}): Promise<SpendPaymentPrepareResult> {
  const { session, spendExperience, normalizedWallet, authUserId, distinctId } =
    input;

  if (session.user_id !== authUserId) {
    return { ok: false, error: 'Forbidden', httpStatus: 403 };
  }

  if (session.wallet_address.toLowerCase() !== normalizedWallet) {
    return {
      ok: false,
      error: 'Wallet does not match this session',
      httpStatus: 400,
    };
  }

  const now = new Date();
  if (now > new Date(session.expires_at)) {
    return { ok: false, error: 'Spend session expired', httpStatus: 400 };
  }

  const openGate = assertSpendExperienceOpenForSessions(spendExperience, now);
  if (!openGate.ok) {
    return {
      ok: false,
      error: 'Spend experience is not active',
      httpStatus: 400,
    };
  }

  const spendPaymentRail = getSpendPaymentRail(spendExperience.spend_rail);
  const userSignedGate =
    spendPaymentRail.assertUserSignedOnchainPaymentConfirmSupported();
  if (!userSignedGate.ok) {
    return {
      ok: false,
      error: userSignedGate.error.userMessage,
      httpStatus: 400,
    };
  }

  const { usdcAmount } = computeConversionAmounts(spendExperience);

  const pointConversion = await getPointConversionBySessionId(session.id);
  const fundedConversion =
    pointConversion?.status === 'funded' ? pointConversion : null;

  let payingWithOwnUsdc = false;
  if (!fundedConversion) {
    const userUsdc = await fetchUserUsdcBalanceSafe(normalizedWallet);
    if (userUsdc !== null && userUsdc >= usdcAmount) {
      payingWithOwnUsdc = true;
    } else {
      return {
        ok: false,
        error: 'Conversion must be completed before payment',
        httpStatus: 400,
      };
    }
  }

  if (
    payingWithOwnUsdc &&
    pointConversion &&
    pointConversion.status !== 'failed'
  ) {
    return {
      ok: false,
      error:
        'Points conversion is still in progress. Complete or wait for conversion before paying with your wallet.',
      httpStatus: 400,
    };
  }

  const sessionReadyForFundedConversion =
    session.status === 'conversion_complete' ||
    session.status === 'payment_pending';
  const sessionReadyForOwnUsdc =
    payingWithOwnUsdc &&
    (session.status === 'created' || session.status === 'payment_pending');

  if (!sessionReadyForFundedConversion && !sessionReadyForOwnUsdc) {
    return {
      ok: false,
      error: 'Session is not ready for payment',
      httpStatus: 400,
    };
  }

  const receiving = getSpendReceivingWalletAddress(session.spend_rail).trim();
  if (!isEvmAddress(receiving)) {
    return {
      ok: false,
      error: 'Invalid receiving wallet configuration',
      httpStatus: 500,
    };
  }

  const railGate = assertSpendRailAllowsMutatingSpendWork(session.spend_rail);
  if (!railGate.ok) {
    trackSpendPilotRailMutationBlocked(distinctId, {
      mutation: 'payment_prepare',
      ...railGate.analytics,
      spend_experience_id: spendExperience.id,
      event_id: spendExperience.event_id,
      user_id: authUserId,
      wallet_address: normalizedWallet,
      spend_session_id: session.id,
      point_conversion_id: fundedConversion?.id,
    });
    return {
      ok: false,
      error: railGate.error,
      httpStatus: 400,
    };
  }

  const railPrepare = await spendPaymentRail.preparePayment({
    spendSessionId: session.id,
    spendExperienceId: spendExperience.id,
    embeddedEvmWalletAddress: session.wallet_address,
    privyNormalizedWalletAddressLower: normalizedWallet,
    usdcAmount,
  });

  if (!railPrepare.ok) {
    return {
      ok: false,
      error: railPrepare.error.userMessage,
      httpStatus: 400,
    };
  }

  if (railPrepare.value.status !== 'prepared' || !railPrepare.value.baseUsdc) {
    return {
      ok: false,
      error: 'Payment preparation is not available for this session',
      httpStatus: 400,
    };
  }

  const { preparedAction, verificationSnapshot } = railPrepare.value.baseUsdc;

  const liveReceiving = getSpendReceivingWalletAddress(
    session.spend_rail
  ).toLowerCase();
  const liveUsdc = getSpendRailBaseUsdcContractAddress().toLowerCase();

  if (
    !spendBaseUsdcSnapshotMatchesLiveRail({
      snapshot: verificationSnapshot,
      liveSpendRail: session.spend_rail,
      liveReceivingLower: liveReceiving,
      liveUsdcContractLower: liveUsdc,
      liveChainId: POSTER_CHECKOUT_CHAIN_ID,
    })
  ) {
    return {
      ok: false,
      error: 'Invalid payment rail configuration',
      httpStatus: 500,
    };
  }

  const { row, created } = await insertSpendPaymentPrepareOrGet({
    spendSessionId: session.id,
    userId: authUserId,
    spendRail: session.spend_rail,
    preparedAction: { ...preparedAction },
    verificationSnapshot: { ...verificationSnapshot },
  });

  const newAction = { ...preparedAction } as Record<string, unknown>;
  const newSnap = { ...verificationSnapshot } as Record<string, unknown>;

  if (
    !created &&
    snapshotsContentEqual(row.prepared_action, newAction) &&
    snapshotsContentEqual(row.verification_snapshot, newSnap)
  ) {
    return {
      ok: true,
      preparedAction: row.prepared_action,
      session: {
        id: session.id,
        status: session.status,
        expires_at: session.expires_at,
      },
    };
  }

  if (!created) {
    const updated = await updateSpendPaymentPreparePayload(row.id, {
      preparedAction: newAction,
      verificationSnapshot: newSnap,
    });
    return {
      ok: true,
      preparedAction: updated.prepared_action,
      session: {
        id: session.id,
        status: session.status,
        expires_at: session.expires_at,
      },
    };
  }

  return {
    ok: true,
    preparedAction: row.prepared_action,
    session: {
      id: session.id,
      status: session.status,
      expires_at: session.expires_at,
    },
  };
}

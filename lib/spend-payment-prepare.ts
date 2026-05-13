import {
  getPointConversionBySessionId,
  getSpendTransactionBySessionId,
} from '@/lib/db/spend-sessions';
import {
  insertSpendPaymentPrepareOrGet,
  patchSpendPaymentPrepare,
  spendPaymentOperationClientSummary,
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
import { stellarWalletAddressSchema } from '@/lib/schemas/player';
import {
  spendBaseUsdcSnapshotMatchesLiveRail,
  spendStellarUsdcSnapshotMatchesLiveRail,
} from '@/lib/spend-payment-prepare-types';
import {
  isEvmAddress,
  POSTER_CHECKOUT_CHAIN_ID,
} from '@/lib/walletconnect-poster-direct-usdc';
import { trackSpendPilotRailMutationBlocked } from '@/lib/analytics/server';
import type { SpendPilotApiHttpStatus } from '@/lib/spend-pilot-http-status';
import type {
  SpendExperience,
  SpendPaymentOperationClientSummary,
  SpendSession,
} from '@/lib/types';

export type { SpendPilotApiHttpStatus } from '@/lib/spend-pilot-http-status';
export { getSpendPaymentSessionContextOr404 as getSpendPaymentPrepareContextOr404 } from '@/lib/spend-payment-session-context';
export { spendPaymentOperationClientSummary } from '@/lib/db/spend-payment-prepare';

const NEEDS_REVIEW_PREPARE_MESSAGE =
  'This payment is under review. Please contact support with your transaction hash if you already sent funds. Do not send another payment.';

export type SpendPaymentPrepareResult =
  | {
      ok: true;
      preparedAction: Record<string, unknown>;
      session: Pick<SpendSession, 'id' | 'status' | 'expires_at'>;
      paymentOperation: SpendPaymentOperationClientSummary;
    }
  | {
      ok: false;
      error: string;
      httpStatus: SpendPilotApiHttpStatus;
      details?: { paymentOperation?: SpendPaymentOperationClientSummary };
    };

/** Canonical JSON for compare — PostgreSQL jsonb does not preserve object key order. */
function stableJsonStringify(value: unknown): string {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'number' || t === 'boolean') return JSON.stringify(value);
  if (t === 'string') return JSON.stringify(value);
  if (t !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJsonStringify(item)).join(',')}]`;
  }
  const o = value as Record<string, unknown>;
  const keys = Object.keys(o).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableJsonStringify(o[k])}`)
    .join(',')}}`;
}

function snapshotPairUnchanged(
  rowAction: Record<string, unknown>,
  rowSnap: Record<string, unknown>,
  nextAction: Record<string, unknown>,
  nextSnap: Record<string, unknown>
): boolean {
  return (
    stableJsonStringify([rowAction, rowSnap]) ===
    stableJsonStringify([nextAction, nextSnap])
  );
}

function paymentPrepareResponseSession(
  session: SpendSession
): Pick<SpendSession, 'id' | 'status' | 'expires_at'> {
  return {
    id: session.id,
    status: session.status,
    expires_at: session.expires_at,
  };
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

  if (session.status === 'payment_complete') {
    return {
      ok: false,
      error: 'Payment already completed for this session.',
      httpStatus: 409,
    };
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

  const receiving = getSpendReceivingWalletAddress(
    spendExperience.spend_rail
  ).trim();
  if (spendExperience.spend_rail === 'base_usdc') {
    if (!isEvmAddress(receiving)) {
      return {
        ok: false,
        error: 'Invalid receiving wallet configuration',
        httpStatus: 500,
      };
    }
  } else if (spendExperience.spend_rail === 'stellar_usdc') {
    if (!stellarWalletAddressSchema.safeParse(receiving).success) {
      return {
        ok: false,
        error: 'Invalid receiving wallet configuration',
        httpStatus: 500,
      };
    }
  } else {
    return {
      ok: false,
      error: 'Invalid payment rail configuration',
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
    sessionOwnerPrivyUserId: authUserId,
    railUserWalletAddress: session.rail_user_wallet_address,
    usdcAmount,
  });

  if (!railPrepare.ok) {
    return {
      ok: false,
      error: railPrepare.error.userMessage,
      httpStatus: 400,
    };
  }

  if (railPrepare.value.status !== 'prepared') {
    return {
      ok: false,
      error: 'Payment preparation is not available for this session',
      httpStatus: 400,
    };
  }

  let newAction: Record<string, unknown>;
  let newSnap: Record<string, unknown>;

  if (session.spend_rail === 'base_usdc') {
    if (!railPrepare.value.baseUsdc) {
      return {
        ok: false,
        error: 'Payment preparation is not available for this session',
        httpStatus: 400,
      };
    }
    const { preparedAction, verificationSnapshot } = railPrepare.value.baseUsdc;

    const liveReceiving = receiving.toLowerCase();
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

    newAction = { ...preparedAction } as Record<string, unknown>;
    newSnap = { ...verificationSnapshot } as Record<string, unknown>;
  } else if (session.spend_rail === 'stellar_usdc') {
    if (!railPrepare.value.stellarUsdc) {
      return {
        ok: false,
        error: 'Payment preparation is not available for this session',
        httpStatus: 400,
      };
    }
    const { preparedAction, verificationSnapshot } =
      railPrepare.value.stellarUsdc;
    const usdcIssuer = verificationSnapshot.usdc_issuer;
    const usdcCode = verificationSnapshot.usdc_asset_code;
    if (
      !spendStellarUsdcSnapshotMatchesLiveRail({
        snapshot: verificationSnapshot,
        liveSpendRail: session.spend_rail,
        liveReceiving: receiving,
        liveUsdcIssuer: usdcIssuer,
        liveUsdcCode: usdcCode,
      })
    ) {
      return {
        ok: false,
        error: 'Invalid payment rail configuration',
        httpStatus: 500,
      };
    }
    newAction = { ...preparedAction } as Record<string, unknown>;
    newSnap = { ...verificationSnapshot } as Record<string, unknown>;
  } else {
    return {
      ok: false,
      error: 'Payment preparation is not available for this session',
      httpStatus: 400,
    };
  }

  const { row: initialRow, created } = await insertSpendPaymentPrepareOrGet({
    spendSessionId: session.id,
    userId: authUserId,
    spendRail: session.spend_rail,
    preparedAction: newAction,
    verificationSnapshot: newSnap,
  });
  let row = initialRow;

  const spendTx = await getSpendTransactionBySessionId(session.id);

  if (spendTx?.status === 'confirmed' && row.status !== 'confirmed') {
    row = await patchSpendPaymentPrepare(row.id, { status: 'confirmed' });
  }

  if (
    spendTx?.status === 'failed' &&
    (spendTx.payment_tx_hash ?? '').trim().length > 0 &&
    row.status === 'submitted'
  ) {
    row = await patchSpendPaymentPrepare(row.id, {
      status: 'failed',
      lastFailureReason: spendTx.failed_reason ?? 'verification_failed',
      lastFailureAt: spendTx.completed_at ?? new Date().toISOString(),
      lastAmbiguityMetadata: null,
    });
  }

  const opSummary = () => spendPaymentOperationClientSummary(row);

  if (spendTx?.status === 'confirmed') {
    return {
      ok: false,
      error: 'Payment already completed for this session.',
      httpStatus: 409,
      details: { paymentOperation: opSummary() },
    };
  }

  if (row.status === 'needs_review') {
    return {
      ok: false,
      error: NEEDS_REVIEW_PREPARE_MESSAGE,
      httpStatus: 400,
      details: { paymentOperation: opSummary() },
    };
  }

  if (row.status === 'confirmed') {
    return {
      ok: false,
      error: 'Payment already completed for this session.',
      httpStatus: 409,
      details: { paymentOperation: opSummary() },
    };
  }

  if (row.status === 'failed') {
    row = await patchSpendPaymentPrepare(row.id, {
      status: 'prepared',
      preparedAction: newAction,
      verificationSnapshot: newSnap,
      attemptCount: row.attempt_count + 1,
    });
    return {
      ok: true,
      preparedAction: row.prepared_action,
      session: paymentPrepareResponseSession(session),
      paymentOperation: spendPaymentOperationClientSummary(row),
    };
  }

  if (
    !created &&
    snapshotPairUnchanged(
      row.prepared_action,
      row.verification_snapshot,
      newAction,
      newSnap
    )
  ) {
    return {
      ok: true,
      preparedAction: row.prepared_action,
      session: paymentPrepareResponseSession(session),
      paymentOperation: spendPaymentOperationClientSummary(row),
    };
  }

  if (!created) {
    const updated = await updateSpendPaymentPreparePayload(row.id, {
      preparedAction: newAction,
      verificationSnapshot: newSnap,
    });
    row = updated;
    return {
      ok: true,
      preparedAction: updated.prepared_action,
      session: paymentPrepareResponseSession(session),
      paymentOperation: spendPaymentOperationClientSummary(row),
    };
  }

  return {
    ok: true,
    preparedAction: row.prepared_action,
    session: paymentPrepareResponseSession(session),
    paymentOperation: spendPaymentOperationClientSummary(row),
  };
}

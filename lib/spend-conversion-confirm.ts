import { checkAndTrackTierProgression } from '@/lib/tier-progression';
import { getPlayerByWallet } from '@/lib/db/players';
import {
  confirmSpendConversionAtomic,
  getPointConversionBySessionId,
  getSpendSessionById,
  refundSpendConversionOnFundingFailure,
  retrySpendConversionAfterRefundAtomic,
  spendConversionFundingIdempotencyKey,
  type RetrySpendConversionAfterRefundRpcResult,
  updatePointConversionFields,
  updateSpendSessionStatus,
} from '@/lib/db/spend-sessions';
import { getSpendExperienceById } from '@/lib/db/spend-experiences';
import { assertSpendExperienceOpenForSessions } from '@/lib/spend-experience-guard';
import {
  computeConversionAmounts,
  loadSpendEligibilityForSession,
} from '@/lib/spend-conversion-preview';
import {
  SPEND_CONVERSION_FAILED_REQUIRES_RETRY_ACTION,
  SPEND_ELIGIBILITY_MESSAGES,
  SPEND_STELLAR_TREASURY_INSUFFICIENT_MESSAGE,
} from '@/lib/spend-eligibility-messages';
import { resolvePrivyServerTransactionHash } from '@/lib/api/privy';
import {
  findRecentTreasuryUsdcTransfer,
  getTreasuryTxReceiptStatus,
  isEvmTxHash,
} from '@/lib/spend-treasury-usdc-transfer';
import { getSpendTreasuryFundingWalletMeta } from '@/lib/spend-server-wallet';
import { insertTreasuryFundUserLedgerIfAbsent } from '@/lib/db/treasury-transactions';
import {
  explorerTxUrlForSpendLedger,
  isStellarTransactionHash,
  isValidSpendConversionFundingTxReference,
} from '@/lib/spend-ledger-explorer-url';
import { spendConversionResumeInvokesWalletReadinessOrchestration } from '@/lib/spend/spend-conversion-resume-policy';
import { getSpendPaymentRail } from '@/lib/spend/payment-rails';
import { getStellarTreasuryFundingTxOutcome } from '@/lib/spend/stellar-treasury-funding';
import type { SpendPaymentRailSessionContext } from '@/lib/spend/payment-rails/types';
import {
  spendRailErrorCategoryToHttpStatus,
  type SpendRailErrorCategory,
} from '@/lib/spend/payment-rails/errors';
import {
  assertSpendRailAllowsMutatingSpendWork,
  isSpendRailOperational,
} from '@/lib/spend-rail-config';
import {
  resolveServerIdentity,
  trackSpendConversionCompleted,
  trackSpendConversionConfirmed,
  trackSpendConversionFailed,
  trackSpendPilotRailMutationBlocked,
  trackSpendTreasuryInsufficientFunds,
} from '@/lib/analytics/server';
import type { SpendPilotConversionEventProperties } from '@/lib/analytics/types';
import type {
  PointConversion,
  PointConversionLastFailure,
  SpendExperience,
  SpendSession,
} from '@/lib/types';

const RESUMABLE: PointConversion['status'][] = [
  'points_deducted',
  'funding_pending',
  'needs_review',
];
const MISCONFIGURED_CONVERSION_ERROR =
  'Conversion is not configured correctly. Please contact support.';
const FUNDING_ACKNOWLEDGED_MESSAGE =
  'USDC transfer submitted. We are confirming it on Base.';

function fundingAcknowledgedMessage(
  spendRail: SpendSession['spend_rail']
): string {
  return spendRail === 'stellar_usdc'
    ? 'USDC transfer submitted. We are confirming it on Stellar.'
    : FUNDING_ACKNOWLEDGED_MESSAGE;
}

export type SpendConversionConfirmIntent = 'confirm' | 'retry_conversion';

export type SpendConversionConfirmResult =
  | {
      ok: true;
      pointConversion: PointConversion;
      session: SpendSession;
      resumed: boolean;
      /** Drives client toasts: do not show “USDC on the way” when `processing`. */
      clientHint: 'funded' | 'processing';
    }
  | {
      ok: false;
      httpStatus: 400 | 401 | 403 | 404 | 409 | 500;
      error: string;
      capture?: boolean;
    };

function conversionClientHint(
  pointConversion: PointConversion
): 'funded' | 'processing' {
  return pointConversion.status === 'funded' ? 'funded' : 'processing';
}

async function persistConversionLastFailure(input: {
  conversionId: string;
  phase: PointConversionLastFailure['phase'];
  category: string;
  reasonSnippet: string;
}): Promise<void> {
  try {
    await updatePointConversionFields(input.conversionId, {
      conversion_last_failure: {
        recorded_at: new Date().toISOString(),
        phase: input.phase,
        category: input.category,
        reason_snippet: input.reasonSnippet.slice(0, 500),
      },
    });
  } catch (e) {
    // Best-effort audit metadata; do not block refund or confirm responses.
    console.error('persistConversionLastFailure:', e);
  }
}

function embeddedSpendWalletForSession(session: SpendSession): string {
  if (session.spend_rail === 'stellar_usdc') {
    const rail = session.rail_user_wallet_address?.trim();
    if (rail) return rail;
    return session.wallet_address.trim();
  }
  return session.wallet_address.trim();
}

/** Logs on failure; refund RPC errors do not block returning the user-facing rail error. */
async function refundSpendConversionPointsBestEffort(input: {
  conversion: PointConversion;
  session: SpendSession;
  failedReason: string;
}): Promise<boolean> {
  try {
    await refundSpendConversionOnFundingFailure({
      conversionId: input.conversion.id,
      userId: input.conversion.user_id,
      spendSessionId: input.session.id,
      pointsToRefund: Math.ceil(Number(input.conversion.points_deducted)),
      failedReason: input.failedReason.slice(0, 256),
    });
    return true;
  } catch (e) {
    console.error('refundSpendConversionOnFundingFailure:', e);
    return false;
  }
}

async function conversionRailFailureOutcome(input: {
  phase: 'readiness' | 'funding';
  conv: PointConversion;
  session: SpendSession;
  distinctId: string;
  baseAnalytics: SpendPilotConversionEventProperties;
  category: SpendRailErrorCategory;
  userMessage: string;
}): Promise<{
  kind: 'error';
  value: SpendConversionConfirmResult;
  pointsRefunded?: number;
}> {
  const prefix = input.phase === 'readiness' ? 'readiness' : 'funding';
  const refundOk = await refundSpendConversionPointsBestEffort({
    conversion: input.conv,
    session: input.session,
    failedReason: `${prefix}:${input.category}:${input.userMessage}`,
  });
  void persistConversionLastFailure({
    conversionId: input.conv.id,
    phase: input.phase,
    category: input.category,
    reasonSnippet: input.userMessage,
  });
  trackSpendConversionFailed(input.distinctId, {
    ...input.baseAnalytics,
    point_conversion_id: input.conv.id,
    spend_session_id: input.session.id,
    status: 'failed',
    error_reason: `${prefix}_failed:${input.category}`,
  });
  return {
    kind: 'error',
    value: {
      ok: false,
      httpStatus: spendRailErrorCategoryToHttpStatus(input.category),
      error: input.userMessage,
    },
    ...(refundOk
      ? { pointsRefunded: Math.ceil(Number(input.conv.points_deducted)) }
      : {}),
  };
}

/**
 * IRL-20: after `points_deducted`, run rail readiness then `initiateUserFunding`.
 * Persists `fund_user:<point_conversion_id>` on `point_conversions.idempotency_key` before funding
 * (session uniqueness is enforced by `idx_point_conversions_session_unique`).
 */
async function runWalletReadinessAndUserFunding(input: {
  session: SpendSession;
  spendExperience: SpendExperience;
  normalizedWallet: string;
  pointConversion: PointConversion;
  usdcAmount: number;
  distinctId: string;
  baseAnalytics: SpendPilotConversionEventProperties;
  skipSpendRailMutationGate?: boolean;
}): Promise<
  | { kind: 'funded'; conversion: PointConversion }
  | { kind: 'ambiguous_review'; conversion: PointConversion }
  | { kind: 'readiness_pending'; conversion: PointConversion }
  | { kind: 'readiness_needs_review'; conversion: PointConversion }
  | {
      kind: 'error';
      value: SpendConversionConfirmResult;
      pointsRefunded?: number;
    }
> {
  const {
    session,
    spendExperience,
    normalizedWallet,
    pointConversion,
    usdcAmount,
    distinctId,
    baseAnalytics,
    skipSpendRailMutationGate,
  } = input;

  if (!skipSpendRailMutationGate) {
    const railGate = assertSpendRailAllowsMutatingSpendWork(session.spend_rail);
    if (!railGate.ok) {
      trackSpendPilotRailMutationBlocked(distinctId, {
        mutation: 'conversion_confirm',
        ...railGate.analytics,
        spend_experience_id: spendExperience.id,
        event_id: spendExperience.event_id,
        user_id: session.user_id,
        wallet_address: normalizedWallet,
        spend_session_id: session.id,
        point_conversion_id: pointConversion.id,
      });
      return {
        kind: 'error',
        value: {
          ok: false,
          httpStatus: 400,
          error: railGate.error,
        },
      };
    }
  }

  const treasuryMeta = getSpendTreasuryFundingWalletMeta(spendExperience);
  if (!treasuryMeta) {
    return {
      kind: 'error',
      value: {
        ok: false,
        httpStatus: 500,
        error: MISCONFIGURED_CONVERSION_ERROR,
      },
    };
  }

  const fundingKey = spendConversionFundingIdempotencyKey(pointConversion.id);
  let conv = pointConversion;
  if (!conv.idempotency_key) {
    conv = await updatePointConversionFields(conv.id, {
      idempotency_key: fundingKey,
    });
  }

  const rail = getSpendPaymentRail(session.spend_rail);
  const ctx: SpendPaymentRailSessionContext = {
    spendSessionId: session.id,
    spendExperienceId: spendExperience.id,
    pointConversionId: conv.id,
    fundingReferenceId: fundingKey,
    embeddedEvmWalletAddress: embeddedSpendWalletForSession(session),
    privyNormalizedWalletAddressLower: normalizedWallet,
    sessionOwnerPrivyUserId: session.user_id,
    usdcAmount,
  };

  const readiness = await rail.runWalletReadinessOrchestration(ctx);
  if (!readiness.ok) {
    return conversionRailFailureOutcome({
      phase: 'readiness',
      conv,
      session,
      distinctId,
      baseAnalytics,
      category: readiness.error.category,
      userMessage: readiness.error.userMessage,
    });
  }

  if (readiness.value.status === 'needs_review') {
    const updated = await updatePointConversionFields(conv.id, {
      status: 'needs_review',
    });
    await updateSpendSessionStatus(session.id, 'conversion_pending');
    return { kind: 'readiness_needs_review', conversion: updated };
  }

  if (readiness.value.status === 'pending') {
    return { kind: 'readiness_pending', conversion: conv };
  }

  if (readiness.value.status !== 'completed') {
    return {
      kind: 'error',
      value: {
        ok: false,
        httpStatus: 500,
        error: 'Unexpected wallet readiness status.',
      },
    };
  }

  const funding = await rail.initiateUserFunding(ctx);
  if (!funding.ok) {
    return conversionRailFailureOutcome({
      phase: 'funding',
      conv,
      session,
      distinctId,
      baseAnalytics,
      category: funding.error.category,
      userMessage: funding.error.userMessage,
    });
  }

  const { status, txReference } = funding.value;
  const ref = (txReference ?? '').trim();

  if (status === 'confirmed') {
    if (!isValidSpendConversionFundingTxReference(session.spend_rail, ref)) {
      return {
        kind: 'error',
        value: {
          ok: false,
          httpStatus: 500,
          error:
            'Unexpected funding confirmation without a valid transaction hash.',
        },
      };
    }
    const done = await finalizeSpendConversionFunding({
      pointConversion: { ...conv, funding_tx_hash: ref },
      session,
      spendExperience,
      treasuryFromWalletAddress: treasuryMeta.treasuryAddress,
      fundingTxReference: ref,
      distinctId,
      baseAnalytics,
    });
    return { kind: 'funded', conversion: done };
  }

  if (status === 'pending' || status === 'submitted') {
    if (!ref) {
      return {
        kind: 'error',
        value: {
          ok: false,
          httpStatus: 500,
          error: 'Unexpected funding response without a transaction reference.',
        },
      };
    }
    const updated = await updatePointConversionFields(conv.id, {
      status: 'needs_review',
      ...pointConversionFundingHashPatch(session, ref),
    });
    await updateSpendSessionStatus(session.id, 'conversion_pending');
    return { kind: 'ambiguous_review', conversion: updated };
  }

  return {
    kind: 'error',
    value: {
      ok: false,
      httpStatus: 500,
      error: 'Unexpected funding orchestration outcome.',
    },
  };
}

function pointConversionFundingHashPatch(
  session: SpendSession,
  fundingTxHash: string
): Pick<PointConversion, 'funding_tx_hash'> &
  Partial<Pick<PointConversion, 'explorer_tx_url'>> {
  const url = explorerTxUrlForSpendLedger(session.spend_rail, fundingTxHash);
  return {
    funding_tx_hash: fundingTxHash,
    ...(url ? { explorer_tx_url: url } : {}),
  };
}

type ConfirmContext = {
  session: SpendSession;
  spendExperience: SpendExperience;
  normalizedWallet: string;
  authUserId: string;
  distinctId: string;
  usdcAmount: number;
  pointsRequired: number;
  /** Default `confirm`. Use `retry_conversion` only after a safe refunded `failed` row (IRL-17). */
  intent?: SpendConversionConfirmIntent;
};

function restoreTierAfterRefund(params: {
  authUserId: string;
  normalizedWallet: string;
  balanceAfterDeduction: number;
  pointsRestored: number;
}): void {
  void checkAndTrackTierProgression(
    resolveServerIdentity({
      privyUserId: params.authUserId,
      walletAddress: params.normalizedWallet,
    }),
    params.balanceAfterDeduction,
    params.balanceAfterDeduction + params.pointsRestored
  );
}

function restoreTierAfterRefundResumeOnlyWallet(params: {
  normalizedWallet: string;
  balanceNow: number;
  pointsRestored: number;
}): void {
  void checkAndTrackTierProgression(
    resolveServerIdentity({ walletAddress: params.normalizedWallet }),
    params.balanceNow,
    params.balanceNow + params.pointsRestored
  );
}

/**
 * After successful conversion funding, set session to `conversion_complete` (PRD section 11).
 */
async function markSessionAfterFunding(sessionId: string): Promise<void> {
  await updateSpendSessionStatus(sessionId, 'conversion_complete');
}

export async function finalizeSpendConversionFunding(input: {
  pointConversion: PointConversion;
  session: SpendSession;
  spendExperience: SpendExperience;
  treasuryFromWalletAddress: string;
  fundingTxReference: string;
  distinctId: string;
  baseAnalytics: SpendPilotConversionEventProperties;
}): Promise<PointConversion> {
  const done = await updatePointConversionFields(input.pointConversion.id, {
    status: 'funded',
    completed_at: new Date().toISOString(),
    ...pointConversionFundingHashPatch(input.session, input.fundingTxReference),
  });
  const toLedger =
    input.session.spend_rail === 'stellar_usdc'
      ? embeddedSpendWalletForSession(input.session)
      : done.user_wallet_address;
  void insertTreasuryFundUserLedgerIfAbsent({
    spendExperienceId: input.spendExperience.id,
    spendRail: input.spendExperience.spend_rail,
    amount: done.usdc_amount,
    fromWalletAddress: input.treasuryFromWalletAddress,
    toWalletAddress: toLedger,
    txHash: input.fundingTxReference,
  });
  await markSessionAfterFunding(input.session.id);
  trackSpendConversionCompleted(input.distinctId, {
    ...input.baseAnalytics,
    point_conversion_id: done.id,
    spend_session_id: input.session.id,
    status: 'funded',
    funding_tx_hash: input.fundingTxReference,
  });
  return done;
}

export async function tryFinalizePendingSpendConversion(input: {
  pointConversion: PointConversion | null;
  session: SpendSession;
  spendExperience: SpendExperience;
  normalizedWallet: string;
  distinctId: string;
  baseAnalytics: SpendPilotConversionEventProperties;
}): Promise<PointConversion | null> {
  if (!isSpendRailOperational(input.session.spend_rail)) {
    return null;
  }

  const pointConversion =
    input.pointConversion ??
    (await getPointConversionBySessionId(input.session.id));
  if (!pointConversion || !RESUMABLE.includes(pointConversion.status)) {
    return null;
  }

  const treasuryMeta = getSpendTreasuryFundingWalletMeta(input.spendExperience);
  if (!treasuryMeta) return null;

  if (input.session.spend_rail === 'stellar_usdc') {
    const raw = pointConversion.funding_tx_hash?.trim() ?? '';
    if (!raw || !isStellarTransactionHash(raw)) return null;
    const outcome = await getStellarTreasuryFundingTxOutcome(raw);
    if (outcome !== 'success') return null;
    return finalizeSpendConversionFunding({
      pointConversion: { ...pointConversion, funding_tx_hash: raw },
      session: input.session,
      spendExperience: input.spendExperience,
      treasuryFromWalletAddress: treasuryMeta.treasuryAddress,
      fundingTxReference: raw,
      distinctId: input.distinctId,
      baseAnalytics: input.baseAnalytics,
    });
  }

  let hash = pointConversion.funding_tx_hash?.trim() as
    | `0x${string}`
    | undefined;

  if (!hash) {
    const recovered = await findRecentTreasuryUsdcTransfer({
      serverWalletAddress: treasuryMeta.treasuryAddress as `0x${string}`,
      recipientAddress: input.session.wallet_address as `0x${string}`,
      usdcAmount: Number(pointConversion.usdc_amount),
    });
    hash = recovered ?? undefined;
    if (hash) {
      await updatePointConversionFields(
        pointConversion.id,
        pointConversionFundingHashPatch(input.session, hash)
      );
    }
  }

  if (!hash) return null;

  if ((await getTreasuryTxReceiptStatus(hash)) !== 'success') return null;

  return finalizeSpendConversionFunding({
    pointConversion: { ...pointConversion, funding_tx_hash: hash },
    session: input.session,
    spendExperience: input.spendExperience,
    treasuryFromWalletAddress: treasuryMeta.treasuryAddress,
    fundingTxReference: hash,
    distinctId: input.distinctId,
    baseAnalytics: input.baseAnalytics,
  });
}

export async function finalizePendingSpendConversion(input: {
  session: SpendSession;
  spendExperience: SpendExperience;
  distinctId: string;
  walletAddress: string;
  pointsRequired: number;
  usdcAmount: number;
}): Promise<{
  pointConversion: PointConversion;
  session: SpendSession;
} | null> {
  const completed = await tryFinalizePendingSpendConversion({
    pointConversion: null,
    session: input.session,
    spendExperience: input.spendExperience,
    normalizedWallet: input.walletAddress,
    distinctId: input.distinctId,
    baseAnalytics: {
      spend_experience_id: input.spendExperience.id,
      event_id: input.spendExperience.event_id,
      user_id: input.session.user_id,
      wallet_address: input.walletAddress,
      points_amount: input.pointsRequired,
      usdc_amount: input.usdcAmount,
      status: 'funded',
    },
  });

  if (!completed) return null;

  return {
    pointConversion: completed,
    session: (await getSpendSessionById(input.session.id)) ?? input.session,
  };
}

/**
 * Core confirm / resume logic for spend pilot (used by API route and tests).
 */
export async function runSpendConversionConfirm(
  input: ConfirmContext
): Promise<SpendConversionConfirmResult> {
  const { session, spendExperience, normalizedWallet, authUserId, distinctId } =
    input;
  const { usdcAmount, pointsRequired } = input;
  const intent = input.intent ?? 'confirm';
  const now = new Date();

  const baseAnalytics: SpendPilotConversionEventProperties = {
    spend_experience_id: spendExperience.id,
    event_id: spendExperience.event_id,
    user_id: authUserId,
    wallet_address: normalizedWallet,
    points_amount: pointsRequired,
    usdc_amount: usdcAmount,
    status: 'confirm',
  };

  let pointConversion = await getPointConversionBySessionId(session.id);

  if (intent === 'retry_conversion') {
    if (!pointConversion || pointConversion.status !== 'failed') {
      return {
        ok: false,
        httpStatus: 400,
        error:
          'There is no refunded failed conversion to retry for this session.',
      };
    }
  }

  if (pointConversion?.status === 'funded') {
    await markSessionAfterFunding(session.id);
    const freshSession = await getSpendSessionById(session.id);
    return {
      ok: true,
      pointConversion,
      session: freshSession ?? session,
      resumed: true,
      clientHint: conversionClientHint(pointConversion),
    };
  }

  if (pointConversion?.status === 'failed') {
    if (intent !== 'retry_conversion') {
      return {
        ok: false,
        httpStatus: 400,
        error: SPEND_CONVERSION_FAILED_REQUIRES_RETRY_ACTION,
      };
    }

    if (now > new Date(session.expires_at)) {
      return { ok: false, httpStatus: 400, error: 'This session has expired.' };
    }

    const openGate = assertSpendExperienceOpenForSessions(spendExperience, now);
    if (!openGate.ok) {
      return { ok: false, httpStatus: 400, error: openGate.error };
    }

    const retryEligibility = await loadSpendEligibilityForSession({
      session,
      spendExperience,
      now,
    });

    if (retryEligibility.status === 'treasury_insufficient') {
      trackSpendTreasuryInsufficientFunds(distinctId, {
        ...baseAnalytics,
        status: 'treasury_insufficient',
        error_reason: 'treasury_insufficient',
      });
    }

    if (retryEligibility.status !== 'conversion_failed_retryable') {
      if (retryEligibility.status === 'rail_unavailable') {
        const rg = assertSpendRailAllowsMutatingSpendWork(session.spend_rail);
        if (!rg.ok) {
          trackSpendPilotRailMutationBlocked(distinctId, {
            mutation: 'conversion_confirm',
            ...rg.analytics,
            spend_experience_id: spendExperience.id,
            event_id: spendExperience.event_id,
            user_id: authUserId,
            wallet_address: normalizedWallet,
            spend_session_id: session.id,
          });
        }
      }
      return {
        ok: false,
        httpStatus: 400,
        error: retryEligibility.message,
      };
    }

    const retryRailGate = assertSpendRailAllowsMutatingSpendWork(
      session.spend_rail
    );
    if (!retryRailGate.ok) {
      trackSpendPilotRailMutationBlocked(distinctId, {
        mutation: 'conversion_confirm',
        ...retryRailGate.analytics,
        spend_experience_id: spendExperience.id,
        event_id: spendExperience.event_id,
        user_id: authUserId,
        wallet_address: normalizedWallet,
        spend_session_id: session.id,
      });
      return {
        ok: false,
        httpStatus: 400,
        error: retryRailGate.error,
      };
    }

    const retryTreasury = await getSpendPaymentRail(
      session.spend_rail
    ).getTreasurySpendableBalance();
    if (!retryTreasury.ok) {
      return {
        ok: false,
        httpStatus: spendRailErrorCategoryToHttpStatus(
          retryTreasury.error.category
        ),
        error: retryTreasury.error.userMessage,
      };
    }
    const retryBal = retryTreasury.value;
    if (retryBal === null || retryBal < usdcAmount) {
      trackSpendTreasuryInsufficientFunds(distinctId, {
        ...baseAnalytics,
        status: 'treasury_insufficient',
        error_reason: 'treasury_insufficient_at_confirm_retry',
      });
      return {
        ok: false,
        httpStatus: 400,
        error:
          session.spend_rail === 'stellar_usdc'
            ? SPEND_STELLAR_TREASURY_INSUFFICIENT_MESSAGE
            : SPEND_ELIGIBILITY_MESSAGES.treasury_insufficient,
      };
    }

    const retryPlayer = await getPlayerByWallet(session.wallet_address);
    const preRetryPoints =
      retryPlayer != null ? Number(retryPlayer.total_points ?? 0) : 0;

    let retryRpc: RetrySpendConversionAfterRefundRpcResult;
    try {
      retryRpc = await retrySpendConversionAfterRefundAtomic({
        spendSessionId: session.id,
        userId: authUserId,
        walletAddress: session.wallet_address,
        spendExperienceId: spendExperience.id,
        pointsToDeduct: pointsRequired,
        usdcAmount,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('Conversion retry limit reached')) {
        return {
          ok: false,
          httpStatus: 400,
          error: SPEND_ELIGIBILITY_MESSAGES.conversion_failed_retry_exhausted,
        };
      }
      if (
        msg.includes('Insufficient points') ||
        msg.includes('Player not found')
      ) {
        return { ok: false, httpStatus: 400, error: msg, capture: true };
      }
      if (msg.includes('not in a retryable failed state')) {
        return {
          ok: false,
          httpStatus: 409,
          error:
            'This conversion cannot be retried from its current state. Please contact support if this persists.',
        };
      }
      if (
        msg.includes('PGRST202') ||
        msg.includes('retry_spend_conversion_after_refund_atomic')
      ) {
        return {
          ok: false,
          httpStatus: 500,
          error:
            'Points conversion is not available yet. Please try again later.',
        };
      }
      throw e;
    }

    const convAfterRetry = await getPointConversionBySessionId(session.id);
    if (!convAfterRetry) {
      return {
        ok: false,
        httpStatus: 500,
        error:
          'Points conversion could not be loaded. Please try again or contact support.',
      };
    }

    void checkAndTrackTierProgression(
      resolveServerIdentity({
        privyUserId: authUserId,
        walletAddress: normalizedWallet,
      }),
      preRetryPoints,
      retryRpc.playerTotalPoints
    );

    trackSpendConversionConfirmed(distinctId, {
      ...baseAnalytics,
      point_conversion_id: convAfterRetry.id,
      spend_session_id: session.id,
      status: 'points_deducted',
    });
    await updateSpendSessionStatus(session.id, 'conversion_pending');

    const retryFundOutcome = await runWalletReadinessAndUserFunding({
      session,
      spendExperience,
      normalizedWallet,
      pointConversion: convAfterRetry,
      usdcAmount,
      distinctId,
      baseAnalytics,
    });

    if (retryFundOutcome.kind === 'error') {
      if (
        retryFundOutcome.pointsRefunded &&
        convAfterRetry.user_id === authUserId
      ) {
        restoreTierAfterRefund({
          authUserId,
          normalizedWallet,
          balanceAfterDeduction: retryRpc.playerTotalPoints,
          pointsRestored: retryFundOutcome.pointsRefunded,
        });
      }
      return retryFundOutcome.value;
    }

    return {
      ok: true,
      pointConversion: retryFundOutcome.conversion,
      session: (await getSpendSessionById(session.id)) ?? session,
      resumed: true,
      clientHint: conversionClientHint(retryFundOutcome.conversion),
    };
  }

  if (pointConversion && RESUMABLE.includes(pointConversion.status)) {
    const fundResult = await fundOrResumeUsdc({
      pointConversion,
      session,
      spendExperience,
      normalizedWallet,
      usdcAmount,
      distinctId,
      baseAnalytics,
    });
    if (fundResult.error) {
      return fundResult.error;
    }
    pointConversion = fundResult.conversion;
    return {
      ok: true,
      pointConversion,
      session: (await getSpendSessionById(session.id)) ?? session,
      resumed: true,
      clientHint: conversionClientHint(pointConversion),
    };
  }

  if (intent === 'retry_conversion') {
    return {
      ok: false,
      httpStatus: 400,
      error:
        'Retry is only available after a refunded failed conversion for this session.',
    };
  }

  const player = await getPlayerByWallet(session.wallet_address);
  const preRpcPoints = player != null ? Number(player.total_points ?? 0) : 0;

  if (now > new Date(session.expires_at)) {
    return { ok: false, httpStatus: 400, error: 'This session has expired.' };
  }

  const openGate = assertSpendExperienceOpenForSessions(spendExperience, now);
  if (!openGate.ok) {
    return { ok: false, httpStatus: 400, error: openGate.error };
  }

  const eligibility = await loadSpendEligibilityForSession({
    session,
    spendExperience,
    now,
  });

  if (eligibility.status === 'treasury_insufficient') {
    trackSpendTreasuryInsufficientFunds(distinctId, {
      ...baseAnalytics,
      status: 'treasury_insufficient',
      error_reason: 'treasury_insufficient',
    });
  }

  if (eligibility.status !== 'eligible') {
    if (eligibility.status === 'rail_unavailable') {
      const rg = assertSpendRailAllowsMutatingSpendWork(session.spend_rail);
      if (!rg.ok) {
        trackSpendPilotRailMutationBlocked(distinctId, {
          mutation: 'conversion_confirm',
          ...rg.analytics,
          spend_experience_id: spendExperience.id,
          event_id: spendExperience.event_id,
          user_id: authUserId,
          wallet_address: normalizedWallet,
          spend_session_id: session.id,
        });
      }
    }
    return {
      ok: false,
      httpStatus: 400,
      error: eligibility.message,
    };
  }

  const confirmTreasury = await getSpendPaymentRail(
    session.spend_rail
  ).getTreasurySpendableBalance();
  if (!confirmTreasury.ok) {
    return {
      ok: false,
      httpStatus: spendRailErrorCategoryToHttpStatus(
        confirmTreasury.error.category
      ),
      error: confirmTreasury.error.userMessage,
    };
  }
  const bal = confirmTreasury.value;
  if (bal === null || bal < usdcAmount) {
    trackSpendTreasuryInsufficientFunds(distinctId, {
      ...baseAnalytics,
      status: 'treasury_insufficient',
      error_reason: 'treasury_insufficient_at_confirm',
    });
    return {
      ok: false,
      httpStatus: 400,
      error:
        session.spend_rail === 'stellar_usdc'
          ? SPEND_STELLAR_TREASURY_INSUFFICIENT_MESSAGE
          : SPEND_ELIGIBILITY_MESSAGES.treasury_insufficient,
    };
  }

  const treasuryMeta = getSpendTreasuryFundingWalletMeta(spendExperience);
  if (!treasuryMeta) {
    return {
      ok: false,
      httpStatus: 500,
      error: MISCONFIGURED_CONVERSION_ERROR,
    };
  }

  let rpc: Awaited<ReturnType<typeof confirmSpendConversionAtomic>>;
  try {
    rpc = await confirmSpendConversionAtomic({
      spendSessionId: session.id,
      userId: authUserId,
      walletAddress: session.wallet_address,
      spendExperienceId: spendExperience.id,
      pointsToDeduct: pointsRequired,
      usdcAmount,
      treasuryWalletAddress: treasuryMeta.treasuryAddress,
      userWalletAddress: session.wallet_address,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('Already converted for this spend experience')) {
      return {
        ok: false,
        httpStatus: 409,
        error: 'You have already completed a conversion for this event.',
      };
    }
    if (
      msg.includes('Insufficient points') ||
      msg.includes('Player not found')
    ) {
      return { ok: false, httpStatus: 400, error: msg, capture: true };
    }
    if (
      msg.includes('PGRST202') ||
      msg.includes('confirm_spend_conversion_atomic')
    ) {
      return {
        ok: false,
        httpStatus: 500,
        error:
          'Points conversion is not available yet. Please try again later.',
      };
    }
    throw e;
  }

  const conv = await getPointConversionBySessionId(session.id);
  if (!conv) {
    return {
      ok: false,
      httpStatus: 500,
      error:
        'Points conversion could not be loaded. Please try again or contact support.',
    };
  }
  const previousPoints = preRpcPoints;
  const newPoints = rpc.playerTotalPoints;

  if (rpc.outcome === 'created') {
    void checkAndTrackTierProgression(
      resolveServerIdentity({
        privyUserId: authUserId,
        walletAddress: normalizedWallet,
      }),
      previousPoints,
      newPoints
    );

    const confirmedProps = {
      ...baseAnalytics,
      point_conversion_id: conv.id,
      spend_session_id: session.id,
      status: 'points_deducted',
    };
    trackSpendConversionConfirmed(distinctId, confirmedProps);
    await updateSpendSessionStatus(session.id, 'conversion_pending');
  }

  const fundOutcome = await runWalletReadinessAndUserFunding({
    session,
    spendExperience,
    normalizedWallet,
    pointConversion: conv,
    usdcAmount,
    distinctId,
    baseAnalytics,
  });

  if (fundOutcome.kind === 'error') {
    if (fundOutcome.pointsRefunded && conv.user_id === authUserId) {
      restoreTierAfterRefund({
        authUserId,
        normalizedWallet,
        balanceAfterDeduction: newPoints,
        pointsRestored: fundOutcome.pointsRefunded,
      });
    }
    return fundOutcome.value;
  }

  return {
    ok: true,
    pointConversion: fundOutcome.conversion,
    session: (await getSpendSessionById(session.id)) ?? session,
    resumed: rpc.outcome === 'already_exists',
    clientHint: conversionClientHint(fundOutcome.conversion),
  };
}

async function fundOrResumeUsdc(input: {
  pointConversion: PointConversion;
  session: SpendSession;
  spendExperience: SpendExperience;
  normalizedWallet: string;
  usdcAmount: number;
  distinctId: string;
  baseAnalytics: SpendPilotConversionEventProperties;
}): Promise<
  | { conversion: PointConversion; error: null }
  | { error: SpendConversionConfirmResult; conversion?: never }
> {
  const {
    pointConversion,
    session,
    spendExperience,
    normalizedWallet,
    usdcAmount,
    distinctId,
    baseAnalytics,
  } = input;

  const railGate = assertSpendRailAllowsMutatingSpendWork(session.spend_rail);
  if (!railGate.ok) {
    trackSpendPilotRailMutationBlocked(distinctId, {
      mutation: 'conversion_resume',
      ...railGate.analytics,
      spend_experience_id: spendExperience.id,
      event_id: spendExperience.event_id,
      user_id: session.user_id,
      wallet_address: normalizedWallet,
      spend_session_id: session.id,
      point_conversion_id: pointConversion.id,
    });
    return {
      error: {
        ok: false,
        httpStatus: 400,
        error: railGate.error,
      },
    };
  }

  const treasuryMeta = getSpendTreasuryFundingWalletMeta(spendExperience);
  if (!treasuryMeta) {
    return {
      error: {
        ok: false,
        httpStatus: 500,
        error: MISCONFIGURED_CONVERSION_ERROR,
      },
    };
  }

  let conv = pointConversion;
  if (
    !conv.funding_tx_hash &&
    spendConversionResumeInvokesWalletReadinessOrchestration(
      session.spend_rail
    ) &&
    (conv.status === 'points_deducted' ||
      (session.spend_rail === 'stellar_usdc' && conv.status === 'needs_review'))
  ) {
    const onward = await runWalletReadinessAndUserFunding({
      session,
      spendExperience,
      normalizedWallet,
      pointConversion: conv,
      usdcAmount,
      distinctId,
      baseAnalytics,
      skipSpendRailMutationGate: true,
    });
    if (onward.kind === 'error') {
      if (onward.pointsRefunded) {
        const p = await getPlayerByWallet(session.wallet_address);
        if (p) {
          const cur = Number(p.total_points ?? 0);
          restoreTierAfterRefundResumeOnlyWallet({
            normalizedWallet,
            balanceNow: cur,
            pointsRestored: onward.pointsRefunded,
          });
        }
      }
      return { error: onward.value };
    }
    if (onward.kind === 'funded') {
      return { conversion: onward.conversion, error: null };
    }
    if (
      onward.kind === 'readiness_pending' ||
      onward.kind === 'readiness_needs_review'
    ) {
      return { conversion: onward.conversion, error: null };
    }
    conv = onward.conversion;
  }

  return resumeSpendConversionFundingFromChainReferences({
    pointConversion: conv,
    session,
    spendExperience,
    treasuryMeta,
    distinctId,
    baseAnalytics,
    privyResolveOptions: { timeoutMs: 120_000, pollIntervalMs: 1_000 },
  });
}

type SpendTreasuryFundingWalletMeta = NonNullable<
  ReturnType<typeof getSpendTreasuryFundingWalletMeta>
>;

/**
 * Confirms conversion funding from stored tx references only (Privy pending
 * resolution, on-chain recovery, receipt polling, finalize). Does not initiate
 * new treasury sends or wallet readiness (IRL-22 cron / read-path reconcile).
 */
async function resumeSpendConversionFundingFromChainReferences(input: {
  pointConversion: PointConversion;
  session: SpendSession;
  spendExperience: SpendExperience;
  treasuryMeta: SpendTreasuryFundingWalletMeta;
  distinctId: string;
  baseAnalytics: SpendPilotConversionEventProperties;
  /** Defaults match interactive confirm polling. */
  privyResolveOptions?: { timeoutMs: number; pollIntervalMs: number };
}): Promise<
  | { conversion: PointConversion; error: null }
  | { error: SpendConversionConfirmResult; conversion?: never }
> {
  const {
    session,
    spendExperience,
    treasuryMeta,
    distinctId,
    baseAnalytics,
    privyResolveOptions,
  } = input;
  let conv = input.pointConversion;

  let hash = conv.funding_tx_hash?.trim();
  const pendingPrefix = 'pending:';
  const trimmedFunding = conv.funding_tx_hash?.trim() ?? '';
  if (
    session.spend_rail === 'base_usdc' &&
    !hash &&
    trimmedFunding.startsWith(pendingPrefix) &&
    (conv.status === 'funding_pending' || conv.status === 'needs_review')
  ) {
    const privyId = trimmedFunding.slice(pendingPrefix.length).trim();
    if (privyId) {
      try {
        const polled = await resolvePrivyServerTransactionHash(
          { transactionId: privyId },
          privyResolveOptions ?? {
            timeoutMs: 120_000,
            pollIntervalMs: 1_000,
          }
        );
        const normalized = polled?.trim();
        if (normalized && isEvmTxHash(normalized)) {
          hash = normalized;
          conv = await updatePointConversionFields(
            conv.id,
            pointConversionFundingHashPatch(session, hash)
          );
        }
      } catch (e) {
        console.warn('fundOrResumeUsdc pending privy id resolve failed:', e);
      }
    }
  }
  if (
    session.spend_rail === 'base_usdc' &&
    !hash &&
    (conv.status === 'funding_pending' || conv.status === 'needs_review')
  ) {
    const recovered = await findRecentTreasuryUsdcTransfer({
      serverWalletAddress: treasuryMeta.treasuryAddress as `0x${string}`,
      recipientAddress: session.wallet_address as `0x${string}`,
      usdcAmount: Number(conv.usdc_amount),
    });
    const recoveredHash = recovered ?? undefined;
    if (recoveredHash) {
      hash = recoveredHash;
      conv = await updatePointConversionFields(
        conv.id,
        pointConversionFundingHashPatch(session, hash)
      );
    }
  }
  if (!hash) {
    return {
      error: {
        ok: false,
        httpStatus: 409,
        error: fundingAcknowledgedMessage(session.spend_rail),
      } as SpendConversionConfirmResult,
    };
  }

  let receiptStatus: 'success' | 'reverted' | 'pending';
  if (session.spend_rail === 'stellar_usdc' && isStellarTransactionHash(hash)) {
    const o = await getStellarTreasuryFundingTxOutcome(hash);
    if (o === 'success') receiptStatus = 'success';
    else if (o === 'failed') receiptStatus = 'reverted';
    else receiptStatus = 'pending';
  } else if (isEvmTxHash(hash)) {
    const evm = await getTreasuryTxReceiptStatus(hash);
    receiptStatus =
      evm === 'success'
        ? 'success'
        : evm === 'reverted'
          ? 'reverted'
          : 'pending';
  } else {
    return {
      error: {
        ok: false,
        httpStatus: 409,
        error: fundingAcknowledgedMessage(session.spend_rail),
      } as SpendConversionConfirmResult,
    };
  }

  if (receiptStatus === 'reverted') {
    await refundSpendConversionPointsBestEffort({
      conversion: conv,
      session,
      failedReason: 'funding transaction reverted',
    });
    void persistConversionLastFailure({
      conversionId: conv.id,
      phase: 'funding',
      category: 'tx_reverted',
      reasonSnippet:
        'The funding transaction could not be confirmed. Your points have been restored.',
    });
    return {
      error: {
        ok: false,
        httpStatus: 400,
        error:
          'The funding transaction could not be confirmed. Your points have been restored.',
      },
    };
  }

  if (receiptStatus !== 'success') {
    return {
      error: {
        ok: false,
        httpStatus: 409,
        error: fundingAcknowledgedMessage(session.spend_rail),
      },
    };
  }

  const done = await finalizeSpendConversionFunding({
    pointConversion: conv,
    session,
    spendExperience,
    treasuryFromWalletAddress: treasuryMeta.treasuryAddress,
    fundingTxReference: hash,
    distinctId,
    baseAnalytics,
  });

  return { conversion: done, error: null };
}

/**
 * Background-safe conversion funding reconciliation (cron / read-path).
 * Never starts readiness or a new funding send; only chain confirmation and
 * hash discovery from existing references.
 */
export async function reconcileSpendConversionFundingBackground(input: {
  session: SpendSession;
  spendExperience: SpendExperience;
  distinctId: string;
}): Promise<'advanced' | 'unchanged'> {
  const pointConversion = await getPointConversionBySessionId(input.session.id);
  if (!pointConversion || !RESUMABLE.includes(pointConversion.status)) {
    return 'unchanged';
  }

  const normalizedWallet = input.session.wallet_address.toLowerCase();
  const { usdcAmount } = computeConversionAmounts(input.spendExperience);
  const baseAnalytics: SpendPilotConversionEventProperties = {
    spend_experience_id: input.spendExperience.id,
    event_id: input.spendExperience.event_id,
    user_id: input.session.user_id,
    wallet_address: normalizedWallet,
    points_amount: pointConversion.points_deducted,
    usdc_amount: usdcAmount,
    status: 'confirm',
  };

  const finalized = await tryFinalizePendingSpendConversion({
    pointConversion,
    session: input.session,
    spendExperience: input.spendExperience,
    normalizedWallet,
    distinctId: input.distinctId,
    baseAnalytics,
  });
  if (finalized) {
    return 'advanced';
  }

  const conv = await getPointConversionBySessionId(input.session.id);
  if (!conv || !RESUMABLE.includes(conv.status)) {
    return 'unchanged';
  }

  const fundingRef = conv.funding_tx_hash?.trim() ?? '';
  if (!fundingRef && conv.status === 'points_deducted') {
    return 'unchanged';
  }

  const treasuryMeta = getSpendTreasuryFundingWalletMeta(input.spendExperience);
  if (!treasuryMeta) {
    return 'unchanged';
  }

  const res = await resumeSpendConversionFundingFromChainReferences({
    pointConversion: conv,
    session: input.session,
    spendExperience: input.spendExperience,
    treasuryMeta,
    distinctId: input.distinctId,
    baseAnalytics,
    privyResolveOptions: { timeoutMs: 20_000, pollIntervalMs: 2_000 },
  });

  if ('conversion' in res) {
    return 'advanced';
  }
  const failure = res as {
    error: Extract<SpendConversionConfirmResult, { ok: false }>;
  };
  return failure.error.httpStatus === 409 ? 'unchanged' : 'advanced';
}

/**
 * Fetches experience by session; returns 404 if missing.
 */
export async function getSpendContextOr404(sessionId: string): Promise<
  | {
      session: SpendSession;
      spendExperience: SpendExperience;
      usdcAmount: number;
      pointsRequired: number;
    }
  | {
      error: { httpStatus: 400 | 401 | 403 | 404 | 409 | 500; error: string };
    }
> {
  const session = await getSpendSessionById(sessionId);
  if (!session) {
    return {
      error: {
        httpStatus: 404,
        error: 'Spend session not found',
      },
    };
  }
  const spendExperience = await getSpendExperienceById(
    session.spend_experience_id
  );
  if (!spendExperience) {
    return {
      error: {
        httpStatus: 404,
        error: 'Spend experience not found',
      },
    };
  }
  const { usdcAmount, pointsRequired } =
    computeConversionAmounts(spendExperience);
  return { session, spendExperience, usdcAmount, pointsRequired };
}

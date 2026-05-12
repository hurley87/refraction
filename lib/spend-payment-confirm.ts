import { getSpendExperienceById } from '@/lib/db/spend-experiences';
import {
  getPointConversionBySessionId,
  getSpendSessionById,
  getSpendTransactionBySessionId,
  insertSpendTransactionSubmitted,
  updateSpendSessionStatus,
  updateSpendTransactionFields,
  confirmSpendTransactionIfSubmitted,
} from '@/lib/db/spend-sessions';
import { insertTreasuryReceivePaymentLedgerIfAbsent } from '@/lib/db/treasury-transactions';
import {
  explorerTxUrlForSpendLedger,
  isLedgerCanonicalEvmTxHash,
} from '@/lib/spend-ledger-explorer-url';
import {
  computeConversionAmounts,
  fetchUserUsdcBalanceSafe,
} from '@/lib/spend-conversion-preview';
import { assertSpendExperienceOpenForSessions } from '@/lib/spend-experience-guard';
import { verifySpendUsdcPaymentTx } from '@/lib/spend-payment-verify';
import { getSpendPaymentRail } from '@/lib/spend/payment-rails';
import {
  getSpendReceivingWalletAddress,
  isSpendRailOperational,
} from '@/lib/spend-rail-config';
import { isEvmAddress } from '@/lib/walletconnect-poster-direct-usdc';
import type {
  SpendExperience,
  SpendSession,
  SpendTransaction,
} from '@/lib/types';
import {
  trackSpendPaymentCompleted,
  trackSpendPaymentConfirmed,
  trackSpendPaymentFailed,
} from '@/lib/analytics/server';
import type { SpendPilotPaymentEventProperties } from '@/lib/analytics/types';

function normalizeTxHash(raw: string): `0x${string}` | null {
  const t = raw.trim();
  if (!isLedgerCanonicalEvmTxHash(t)) return null;
  return t as `0x${string}`;
}

/** Submitted row already bound to another tx hash (idempotent resubmit uses same hash). */
function submittedPaymentHashConflicts(
  spendTx: SpendTransaction,
  requestedHashLower: string
): boolean {
  if (spendTx.status !== 'submitted') return false;
  const existing = (spendTx.payment_tx_hash ?? '').toLowerCase();
  return existing.length > 0 && existing !== requestedHashLower;
}

/** HTTP statuses allowed by `apiError` for spend pilot routes. */
export type SpendPilotApiHttpStatus = 400 | 401 | 403 | 404 | 409 | 429 | 500;

export async function getSpendPaymentContextOr404(sessionId: string): Promise<
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

export type SpendPaymentConfirmResult =
  | {
      ok: true;
      spendTransaction: SpendTransaction;
      session: SpendSession;
      resumed: boolean;
    }
  | { ok: false; error: string; httpStatus: SpendPilotApiHttpStatus };

const PAYMENT_HASH_CONFLICT: SpendPaymentConfirmResult = {
  ok: false,
  error: 'A different payment is already in progress for this session',
  httpStatus: 409,
};

async function finalizeSuccess(params: {
  spendTransactionId: string;
  sessionId: string;
  distinctId: string;
  analytics: SpendPilotPaymentEventProperties;
}): Promise<boolean> {
  const confirmed = await confirmSpendTransactionIfSubmitted(
    params.spendTransactionId
  );
  if (!confirmed) {
    return false;
  }
  await updateSpendSessionStatus(params.sessionId, 'payment_complete', {
    completed_at: confirmed.completed_at,
  });
  trackSpendPaymentCompleted(params.distinctId, {
    ...params.analytics,
    status: 'confirmed',
    payment_tx_hash: params.analytics.payment_tx_hash,
  });
  return true;
}

async function finalizeFailure(params: {
  spendTransactionId: string;
  sessionId: string;
  distinctId: string;
  analytics: SpendPilotPaymentEventProperties;
  reason: string;
}): Promise<void> {
  const completedAt = new Date().toISOString();
  await updateSpendTransactionFields(params.spendTransactionId, {
    status: 'failed',
    completed_at: completedAt,
    failed_reason: params.reason,
  });
  await updateSpendSessionStatus(params.sessionId, 'payment_pending');
  trackSpendPaymentFailed(params.distinctId, {
    ...params.analytics,
    status: 'failed',
    error_reason: params.reason,
    payment_tx_hash: params.analytics.payment_tx_hash,
  });
}

/**
 * Records and verifies a user USDC payment to the experience receiving wallet (PRD sections 9 and 11).
 */
export async function runSpendPaymentConfirm(input: {
  session: SpendSession;
  spendExperience: SpendExperience;
  normalizedWallet: string;
  authUserId: string;
  distinctId: string;
  paymentTxHash: string;
  usdcAmount: number;
}): Promise<SpendPaymentConfirmResult> {
  const { session, spendExperience, normalizedWallet, authUserId, distinctId } =
    input;
  const txHash = normalizeTxHash(input.paymentTxHash);
  if (!txHash) {
    return { ok: false, error: 'Invalid paymentTxHash', httpStatus: 400 };
  }

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
  const userSignedConfirmGate =
    spendPaymentRail.assertUserSignedOnchainPaymentConfirmSupported();
  if (!userSignedConfirmGate.ok) {
    return {
      ok: false,
      error: userSignedConfirmGate.error.userMessage,
      httpStatus: 400,
    };
  }

  const pointConversion = await getPointConversionBySessionId(session.id);
  const fundedConversion =
    pointConversion?.status === 'funded' ? pointConversion : null;

  let payingWithOwnUsdc = false;
  if (!fundedConversion) {
    const userUsdc = await fetchUserUsdcBalanceSafe(normalizedWallet);
    if (userUsdc !== null && userUsdc >= input.usdcAmount) {
      payingWithOwnUsdc = true;
    } else {
      return {
        ok: false,
        error: 'Conversion must be completed before payment',
        httpStatus: 400,
      };
    }
  }

  // Do not accept direct USDC payment while a points conversion is still in flight for this
  // session (points may already be deducted and treasury funding may complete). Otherwise the
  // user could receive treasury-funded USDC and still pass payment confirm with the same wallet.
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

  const receiving = getSpendReceivingWalletAddress(
    spendExperience.spend_rail
  ).trim();
  if (!isEvmAddress(receiving)) {
    return {
      ok: false,
      error: 'Invalid receiving wallet configuration',
      httpStatus: 500,
    };
  }

  const fromAddr = normalizedWallet as `0x${string}`;
  const toAddr = receiving as `0x${string}`;
  const usdcAmount = input.usdcAmount;
  const requestedHashLower = txHash.toLowerCase();

  const baseAnalytics: SpendPilotPaymentEventProperties = {
    spend_experience_id: spendExperience.id,
    event_id: spendExperience.event_id,
    user_id: authUserId,
    wallet_address: normalizedWallet,
    points_amount: fundedConversion ? fundedConversion.points_deducted : 0,
    usdc_amount: usdcAmount,
    status: 'submitted',
    spend_session_id: session.id,
    point_conversion_id: fundedConversion?.id,
    payment_tx_hash: txHash,
  };

  const sessionReadyForFundedConversion =
    session.status === 'conversion_complete' ||
    session.status === 'payment_pending';
  const sessionReadyForOwnUsdc =
    payingWithOwnUsdc &&
    (session.status === 'created' || session.status === 'payment_pending');

  if (!sessionReadyForFundedConversion && !sessionReadyForOwnUsdc) {
    if (session.status === 'payment_complete') {
      const existing = await getSpendTransactionBySessionId(session.id);
      if (existing?.status === 'confirmed') {
        return {
          ok: true,
          spendTransaction: existing,
          session: { ...session, status: 'payment_complete' },
          resumed: true,
        };
      }
    }
    return {
      ok: false,
      error: 'Session is not ready for payment',
      httpStatus: 400,
    };
  }

  let spendTx = await getSpendTransactionBySessionId(session.id);

  if (!spendTx && !isSpendRailOperational(session.spend_rail)) {
    return {
      ok: false,
      error:
        'This payment network is temporarily unavailable. Please try again later.',
      httpStatus: 400,
    };
  }

  if (spendTx?.status === 'confirmed') {
    const fresh = await getSpendSessionById(session.id);
    return {
      ok: true,
      spendTransaction: spendTx,
      session: fresh ?? { ...session, status: 'payment_complete' },
      resumed: true,
    };
  }

  if (spendTx && submittedPaymentHashConflicts(spendTx, requestedHashLower)) {
    return PAYMENT_HASH_CONFLICT;
  }

  if (spendTx?.status === 'failed') {
    await updateSpendTransactionFields(spendTx.id, {
      status: 'submitted',
      payment_tx_hash: txHash,
      failed_reason: null,
      completed_at: null,
      explorer_tx_url: explorerTxUrlForSpendLedger(session.spend_rail, txHash),
    });
    spendTx = await getSpendTransactionBySessionId(session.id);
  }

  let resumed = false;
  if (!spendTx) {
    const inserted = await insertSpendTransactionSubmitted({
      spendExperienceId: spendExperience.id,
      spendSessionId: session.id,
      userId: authUserId,
      usdcAmount,
      fromWalletAddress: normalizedWallet,
      toWalletAddress: receiving.toLowerCase(),
      paymentTxHash: txHash,
      spendRail: session.spend_rail,
    });

    if (inserted === 'session_duplicate') {
      spendTx = await getSpendTransactionBySessionId(session.id);
      resumed = true;
    } else {
      spendTx = inserted;
    }
  }

  if (!spendTx) {
    return {
      ok: false,
      error: 'Failed to load payment record',
      httpStatus: 500,
    };
  }

  if (submittedPaymentHashConflicts(spendTx, requestedHashLower)) {
    return PAYMENT_HASH_CONFLICT;
  }

  if (spendTx.status === 'pending') {
    await updateSpendTransactionFields(spendTx.id, {
      status: 'submitted',
      payment_tx_hash: txHash,
      explorer_tx_url: explorerTxUrlForSpendLedger(session.spend_rail, txHash),
    });
    spendTx = await getSpendTransactionBySessionId(session.id);
    if (!spendTx) {
      return {
        ok: false,
        error: 'Failed to load payment record',
        httpStatus: 500,
      };
    }
  }

  const isSameSubmittedHash =
    spendTx.status === 'submitted' &&
    (spendTx.payment_tx_hash ?? '').toLowerCase() === requestedHashLower;

  if (!isSameSubmittedHash) {
    trackSpendPaymentConfirmed(distinctId, {
      ...baseAnalytics,
      spend_transaction_id: spendTx.id,
    });
  }

  await updateSpendSessionStatus(session.id, 'payment_pending');

  const verify = await verifySpendUsdcPaymentTx({
    txHash,
    expectedFrom: fromAddr,
    expectedTo: toAddr,
    expectedUsdcAmount: usdcAmount,
  });

  if (!verify.ok) {
    await finalizeFailure({
      spendTransactionId: spendTx.id,
      sessionId: session.id,
      distinctId,
      analytics: { ...baseAnalytics, spend_transaction_id: spendTx.id },
      reason: verify.reason,
    });
    return {
      ok: false,
      error:
        'Payment could not be verified on-chain. If funds left your wallet, contact support with your transaction hash.',
      httpStatus: 400,
    };
  }

  const didWinRace = await finalizeSuccess({
    spendTransactionId: spendTx.id,
    sessionId: session.id,
    distinctId,
    analytics: { ...baseAnalytics, spend_transaction_id: spendTx.id },
  });

  const [updatedTx, freshSession] = await Promise.all([
    getSpendTransactionBySessionId(session.id),
    getSpendSessionById(session.id),
  ]);

  if (updatedTx?.status === 'confirmed' && updatedTx.payment_tx_hash) {
    void insertTreasuryReceivePaymentLedgerIfAbsent({
      spendExperienceId: spendExperience.id,
      spendRail: spendExperience.spend_rail,
      amount: updatedTx.usdc_amount,
      fromWalletAddress: updatedTx.from_wallet_address,
      toWalletAddress: updatedTx.to_wallet_address,
      txHash: updatedTx.payment_tx_hash,
    });
  }

  if (!didWinRace && updatedTx?.status === 'confirmed') {
    return {
      ok: true,
      spendTransaction: updatedTx,
      session: freshSession ?? { ...session, status: 'payment_complete' },
      resumed: true,
    };
  }

  return {
    ok: true,
    spendTransaction: updatedTx ?? spendTx,
    session: freshSession ?? {
      ...session,
      status: 'payment_complete',
      completed_at: new Date().toISOString(),
    },
    resumed: resumed || isSameSubmittedHash,
  };
}

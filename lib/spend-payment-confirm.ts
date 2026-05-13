import {
  getPointConversionBySessionId,
  getSpendSessionById,
  getSpendTransactionBySessionId,
  insertSpendTransactionSubmitted,
  updateSpendSessionStatus,
  updateSpendTransactionFields,
  confirmSpendTransactionIfSubmitted,
} from '@/lib/db/spend-sessions';
import {
  getSpendPaymentPrepareBySessionId,
  patchSpendPaymentPrepare,
  spendPaymentOperationClientSummary,
} from '@/lib/db/spend-payment-prepare';
import { insertTreasuryReceivePaymentLedgerIfAbsent } from '@/lib/db/treasury-transactions';
import {
  explorerTxUrlForSpendLedger,
  isLedgerCanonicalEvmTxHash,
  isStellarTransactionHash,
} from '@/lib/spend-ledger-explorer-url';
import { fetchUserUsdcBalanceSafe } from '@/lib/spend-conversion-preview';
import { assertSpendExperienceOpenForSessions } from '@/lib/spend-experience-guard';
import { verifySpendUsdcPaymentTx } from '@/lib/spend-payment-verify';
import { verifySpendStellarUsdcPaymentTx } from '@/lib/spend-payment-verify-stellar';
import { isAmbiguousSpendPaymentVerifyFailure } from '@/lib/spend-payment-verify-ambiguous';
import { getSpendPaymentRail } from '@/lib/spend/payment-rails';
import {
  assertSpendRailAllowsMutatingSpendWork,
  getSpendRailBaseUsdcContractAddress,
  getSpendReceivingWalletAddress,
} from '@/lib/spend-rail-config';
import {
  getStellarSpendUsdcAssetCode,
  getStellarSpendUsdcIssuer,
} from '@/lib/spend/stellar-wallet-readiness-config';
import { stellarWalletAddressSchema } from '@/lib/schemas/player';
import {
  isSpendBaseUsdcVerificationSnapshotV1,
  isSpendStellarUsdcVerificationSnapshotV1,
  spendBaseUsdcSnapshotMatchesLiveRail,
  spendStellarUsdcSnapshotMatchesLiveRail,
} from '@/lib/spend-payment-prepare-types';
import {
  isEvmAddress,
  POSTER_CHECKOUT_CHAIN_ID,
} from '@/lib/walletconnect-poster-direct-usdc';
import type {
  PointConversion,
  SpendExperience,
  SpendPaymentOperationClientSummary,
  SpendPaymentPrepareOperation,
  SpendSession,
  SpendTransaction,
} from '@/lib/types';
import {
  trackSpendPaymentCompleted,
  trackSpendPaymentConfirmed,
  trackSpendPaymentFailed,
  trackSpendPilotRailMutationBlocked,
} from '@/lib/analytics/server';
import type { SpendPilotPaymentEventProperties } from '@/lib/analytics/types';
import {
  spendPilotRailMixpanelFields,
  spendPilotSanitizedRailErrorFields,
} from '@/lib/analytics/spend-pilot-rail-context';
import { spendRailErrorPaymentFailed } from '@/lib/spend/payment-rails/errors';
import type { SpendPilotApiHttpStatus } from '@/lib/spend-pilot-http-status';

export type { SpendPilotApiHttpStatus } from '@/lib/spend-pilot-http-status';
export { getSpendPaymentSessionContextOr404 as getSpendPaymentContextOr404 } from '@/lib/spend-payment-session-context';

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

export type SpendPaymentConfirmResult =
  | {
      ok: true;
      spendTransaction: SpendTransaction;
      session: SpendSession;
      resumed: boolean;
      paymentOperation?: SpendPaymentOperationClientSummary;
    }
  | {
      ok: false;
      error: string;
      httpStatus: SpendPilotApiHttpStatus;
      details?: { paymentOperation?: SpendPaymentOperationClientSummary };
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
  const paymentFailed = spendRailErrorPaymentFailed();
  trackSpendPaymentFailed(params.distinctId, {
    ...params.analytics,
    ...spendPilotSanitizedRailErrorFields(paymentFailed),
    status: 'failed',
    error_reason: params.reason,
  });
}

type StellarConfirmDeps = {
  fundedConversion: PointConversion | null;
  receivingLive: string;
};

async function runSpendPaymentConfirmStellarUsdc(input: {
  session: SpendSession;
  spendExperience: SpendExperience;
  normalizedWallet: string;
  authUserId: string;
  distinctId: string;
  usdcAmount: number;
  paymentTxHash?: string;
  stellarBackendConfirm?: boolean;
  deps: StellarConfirmDeps;
}): Promise<SpendPaymentConfirmResult> {
  const {
    session,
    spendExperience,
    normalizedWallet,
    authUserId,
    distinctId,
    deps,
  } = input;
  const { fundedConversion, receivingLive } = deps;

  if (!input.stellarBackendConfirm) {
    return {
      ok: false,
      error:
        'Use the in-app Stellar payment confirmation (do not send a transaction hash).',
      httpStatus: 400,
    };
  }
  if (input.paymentTxHash?.trim()) {
    return {
      ok: false,
      error: 'Do not send paymentTxHash for Stellar backend payments.',
      httpStatus: 400,
    };
  }

  const spendPaymentRail = getSpendPaymentRail('stellar_usdc');

  const [preparedOp, spendTxInitial] = await Promise.all([
    getSpendPaymentPrepareBySessionId(session.id),
    getSpendTransactionBySessionId(session.id),
  ]);

  if (!preparedOp) {
    return {
      ok: false,
      error:
        'Payment is not ready to confirm. Refresh this page to prepare your payment.',
      httpStatus: 400,
    };
  }

  if (preparedOp.status === 'needs_review') {
    return {
      ok: false,
      error:
        'This payment is under review. Please contact support and do not send another payment.',
      httpStatus: 400,
      details: {
        paymentOperation: spendPaymentOperationClientSummary(preparedOp),
      },
    };
  }

  if (preparedOp.status === 'failed') {
    return {
      ok: false,
      error:
        'Prepare your payment again in this app after a failed attempt, then try paying again.',
      httpStatus: 400,
      details: {
        paymentOperation: spendPaymentOperationClientSummary(preparedOp),
      },
    };
  }

  if (
    preparedOp.status === 'confirmed' &&
    spendTxInitial?.status === 'confirmed'
  ) {
    const fresh = await getSpendSessionById(session.id);
    return {
      ok: true,
      spendTransaction: spendTxInitial,
      session: fresh ?? { ...session, status: 'payment_complete' },
      resumed: true,
      paymentOperation: spendPaymentOperationClientSummary(preparedOp),
    };
  }

  const snap = preparedOp.verification_snapshot;
  if (!isSpendStellarUsdcVerificationSnapshotV1(snap)) {
    return {
      ok: false,
      error:
        'Payment is not ready to confirm. Refresh this page to prepare your payment.',
      httpStatus: 400,
    };
  }

  const issuerLive = getStellarSpendUsdcIssuer();
  const codeLive = getStellarSpendUsdcAssetCode();
  if (
    !issuerLive ||
    !spendStellarUsdcSnapshotMatchesLiveRail({
      snapshot: snap,
      liveSpendRail: session.spend_rail,
      liveReceiving: receivingLive,
      liveUsdcIssuer: issuerLive,
      liveUsdcCode: codeLive,
    })
  ) {
    return {
      ok: false,
      error:
        'Payment no longer matches the configured receiving wallet. Refresh this page and try again.',
      httpStatus: 400,
    };
  }

  const railAddr = session.rail_user_wallet_address?.trim() ?? '';
  if (!railAddr || snap.from_wallet !== railAddr) {
    return {
      ok: false,
      error:
        'Payment details do not match this session. Refresh this page and try again.',
      httpStatus: 400,
    };
  }

  if (snap.usdc_amount !== input.usdcAmount) {
    return {
      ok: false,
      error:
        'Payment details do not match this session. Refresh this page and try again.',
      httpStatus: 400,
    };
  }

  let spendTx: SpendTransaction | null = spendTxInitial;

  const stellarAnalyticsBase: SpendPilotPaymentEventProperties = {
    ...spendPilotRailMixpanelFields(session.spend_rail),
    spend_experience_id: spendExperience.id,
    event_id: spendExperience.event_id,
    user_id: authUserId,
    wallet_address: normalizedWallet,
    points_amount: fundedConversion ? fundedConversion.points_deducted : 0,
    usdc_amount: snap.usdc_amount,
    status: 'submitted',
    spend_session_id: session.id,
    point_conversion_id: fundedConversion?.id,
    payment_tx_hash: spendTx?.payment_tx_hash ?? '',
    spend_payment_prepare_operation_id: preparedOp.id,
  };

  const applyStellarPrepareTerminal = async (
    status: 'confirmed' | 'failed' | 'needs_review',
    patch: {
      lastFailureReason?: string | null;
      lastFailureAt?: string | null;
      lastAmbiguityMetadata?: Record<string, unknown> | null;
    }
  ) => {
    await patchSpendPaymentPrepare(preparedOp.id, {
      status,
      lastFailureReason: patch.lastFailureReason ?? null,
      lastFailureAt: patch.lastFailureAt ?? null,
      lastAmbiguityMetadata: patch.lastAmbiguityMetadata ?? null,
    });
  };

  const handleVerifyOutcome = async (
    ledgerHash: string,
    verify: Awaited<ReturnType<typeof verifySpendStellarUsdcPaymentTx>>
  ): Promise<SpendPaymentConfirmResult> => {
    if (verify.ok) {
      if (!spendTx) {
        return {
          ok: false,
          error: 'Failed to load payment record',
          httpStatus: 500,
        };
      }
      const didWin = await finalizeSuccess({
        spendTransactionId: spendTx.id,
        sessionId: session.id,
        distinctId,
        analytics: {
          ...stellarAnalyticsBase,
          spend_transaction_id: spendTx.id,
          payment_tx_hash: ledgerHash,
        },
      });
      await applyStellarPrepareTerminal('confirmed', {
        lastFailureReason: null,
        lastFailureAt: null,
        lastAmbiguityMetadata: null,
      });
      const [updatedTx, freshSession, prepFresh] = await Promise.all([
        getSpendTransactionBySessionId(session.id),
        getSpendSessionById(session.id),
        getSpendPaymentPrepareBySessionId(session.id),
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
      return {
        ok: true,
        spendTransaction: updatedTx ?? spendTx,
        session: freshSession ?? { ...session, status: 'payment_complete' },
        resumed: !didWin,
        paymentOperation: prepFresh
          ? spendPaymentOperationClientSummary(prepFresh)
          : undefined,
      };
    }

    const nowIso = new Date().toISOString();
    if (isAmbiguousSpendPaymentVerifyFailure(verify.reason)) {
      const opRow = await patchSpendPaymentPrepare(preparedOp.id, {
        status: 'needs_review',
        lastFailureReason: verify.reason,
        lastFailureAt: nowIso,
        lastAmbiguityMetadata: {
          spend_transaction_id: spendTx?.id,
          verify_reason: verify.reason,
        },
      });
      return {
        ok: false,
        error:
          'We could not fully verify this payment yet. Please contact support and do not send another payment.',
        httpStatus: 400,
        details: {
          paymentOperation: spendPaymentOperationClientSummary(opRow),
        },
      };
    }

    if (spendTx) {
      await finalizeFailure({
        spendTransactionId: spendTx.id,
        sessionId: session.id,
        distinctId,
        analytics: {
          ...stellarAnalyticsBase,
          spend_transaction_id: spendTx.id,
          payment_tx_hash: ledgerHash,
        },
        reason: verify.reason,
      });
    }
    await applyStellarPrepareTerminal('failed', {
      lastFailureReason: verify.reason,
      lastFailureAt: nowIso,
      lastAmbiguityMetadata: null,
    });
    const opAfter = await getSpendPaymentPrepareBySessionId(session.id);
    return {
      ok: false,
      error:
        'Payment could not be verified on-chain. If funds left your wallet, contact support with your transaction hash.',
      httpStatus: 400,
      details: opAfter
        ? { paymentOperation: spendPaymentOperationClientSummary(opAfter) }
        : undefined,
    };
  };

  // Resume: already submitted on-chain; verify only (no second Privy submit).
  if (
    spendTx?.status === 'submitted' &&
    preparedOp.status === 'submitted' &&
    isStellarTransactionHash(spendTx.payment_tx_hash)
  ) {
    const ledgerHash = spendTx.payment_tx_hash!.trim().toLowerCase();
    const verify = await verifySpendStellarUsdcPaymentTx({
      txHash: ledgerHash,
      expectedFrom: snap.from_wallet,
      expectedTo: snap.receiving_wallet,
      expectedUsdcAmount: snap.usdc_amount,
      usdcIssuer: issuerLive,
      usdcCode: codeLive,
    });
    await updateSpendSessionStatus(session.id, 'payment_pending');
    return handleVerifyOutcome(ledgerHash, verify);
  }

  const railGate = assertSpendRailAllowsMutatingSpendWork(session.spend_rail);
  if (!railGate.ok) {
    trackSpendPilotRailMutationBlocked(distinctId, {
      mutation: 'payment_confirm',
      ...railGate.analytics,
      ...spendPilotRailMixpanelFields(session.spend_rail),
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

  if (spendTx?.status === 'confirmed') {
    const fresh = await getSpendSessionById(session.id);
    const prepOp = await getSpendPaymentPrepareBySessionId(session.id);
    return {
      ok: true,
      spendTransaction: spendTx,
      session: fresh ?? { ...session, status: 'payment_complete' },
      resumed: true,
      paymentOperation: prepOp
        ? spendPaymentOperationClientSummary(prepOp)
        : undefined,
    };
  }

  const railConfirm = await spendPaymentRail.confirmPayment({
    spendSessionId: session.id,
    spendExperienceId: spendExperience.id,
    sessionOwnerPrivyUserId: authUserId,
    railUserWalletAddress: session.rail_user_wallet_address,
    usdcAmount: snap.usdc_amount,
  });

  if (!railConfirm.ok) {
    trackSpendPaymentFailed(distinctId, {
      ...stellarAnalyticsBase,
      status: 'failed',
      error_reason: 'payment_submit_rejected',
      ...spendPilotSanitizedRailErrorFields(railConfirm.error),
    });
    return {
      ok: false,
      error: railConfirm.error.userMessage,
      httpStatus: 400,
      details: {
        paymentOperation: spendPaymentOperationClientSummary(preparedOp),
      },
    };
  }

  const outcome = railConfirm.value;
  const ledgerRef = outcome.ledgerTxReference?.trim() ?? '';
  if (!ledgerRef || !isStellarTransactionHash(ledgerRef)) {
    trackSpendPaymentFailed(distinctId, {
      ...stellarAnalyticsBase,
      ...(spendTx ? { spend_transaction_id: spendTx.id } : {}),
      status: 'failed',
      error_reason: 'payment_submit_missing_ledger_ref',
      ...spendPilotSanitizedRailErrorFields(spendRailErrorPaymentFailed()),
    });
    return {
      ok: false,
      error: 'Payment submission did not return a ledger reference.',
      httpStatus: 500,
    };
  }

  if (outcome.status !== 'submitted') {
    trackSpendPaymentFailed(distinctId, {
      ...stellarAnalyticsBase,
      ...(spendTx ? { spend_transaction_id: spendTx.id } : {}),
      status: 'failed',
      error_reason: 'payment_submit_unexpected_state',
      ...spendPilotSanitizedRailErrorFields(spendRailErrorPaymentFailed()),
    });
    return {
      ok: false,
      error: 'Unexpected payment submission state.',
      httpStatus: 500,
    };
  }

  let resumed = false;
  if (!spendTx) {
    const inserted = await insertSpendTransactionSubmitted({
      spendExperienceId: spendExperience.id,
      spendSessionId: session.id,
      userId: authUserId,
      usdcAmount: snap.usdc_amount,
      fromWalletAddress: snap.from_wallet,
      toWalletAddress: snap.receiving_wallet,
      paymentTxHash: ledgerRef,
      spendRail: session.spend_rail,
    });
    if (inserted === 'session_duplicate') {
      spendTx = await getSpendTransactionBySessionId(session.id);
      resumed = true;
    } else {
      spendTx = inserted;
    }
  } else if (spendTx.status === 'failed') {
    await updateSpendTransactionFields(spendTx.id, {
      status: 'submitted',
      payment_tx_hash: ledgerRef,
      failed_reason: null,
      completed_at: null,
      explorer_tx_url: explorerTxUrlForSpendLedger(
        session.spend_rail,
        ledgerRef
      ),
    });
    spendTx = await getSpendTransactionBySessionId(session.id);
  }

  if (!spendTx) {
    return {
      ok: false,
      error: 'Failed to load payment record',
      httpStatus: 500,
    };
  }

  await patchSpendPaymentPrepare(preparedOp.id, { status: 'submitted' });
  await updateSpendSessionStatus(session.id, 'payment_pending');

  trackSpendPaymentConfirmed(distinctId, {
    ...stellarAnalyticsBase,
    spend_transaction_id: spendTx.id,
    payment_tx_hash: ledgerRef,
  });

  const verify = await verifySpendStellarUsdcPaymentTx({
    txHash: ledgerRef,
    expectedFrom: snap.from_wallet,
    expectedTo: snap.receiving_wallet,
    expectedUsdcAmount: snap.usdc_amount,
    usdcIssuer: issuerLive,
    usdcCode: codeLive,
  });

  const verifyResult = await handleVerifyOutcome(ledgerRef, verify);
  if (verifyResult.ok) {
    return { ...verifyResult, resumed: verifyResult.resumed || resumed };
  }
  return verifyResult;
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
  paymentTxHash?: string;
  usdcAmount: number;
  stellarBackendConfirm?: boolean;
}): Promise<SpendPaymentConfirmResult> {
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
    if (session.status === 'payment_complete') {
      const existing = await getSpendTransactionBySessionId(session.id);
      if (existing?.status === 'confirmed') {
        const prepOp = await getSpendPaymentPrepareBySessionId(session.id);
        return {
          ok: true,
          spendTransaction: existing,
          session: { ...session, status: 'payment_complete' },
          resumed: true,
          paymentOperation: prepOp
            ? spendPaymentOperationClientSummary(prepOp)
            : undefined,
        };
      }
    }
    return {
      ok: false,
      error: 'Session is not ready for payment',
      httpStatus: 400,
    };
  }

  const receivingLive = getSpendReceivingWalletAddress(
    spendExperience.spend_rail
  ).trim();

  if (session.spend_rail === 'stellar_usdc') {
    if (!stellarWalletAddressSchema.safeParse(receivingLive).success) {
      return {
        ok: false,
        error: 'Invalid receiving wallet configuration',
        httpStatus: 500,
      };
    }
    return runSpendPaymentConfirmStellarUsdc({
      session,
      spendExperience,
      normalizedWallet,
      authUserId,
      distinctId,
      usdcAmount: input.usdcAmount,
      paymentTxHash: input.paymentTxHash,
      stellarBackendConfirm: input.stellarBackendConfirm,
      deps: { fundedConversion, receivingLive },
    });
  }

  if (!isEvmAddress(receivingLive)) {
    return {
      ok: false,
      error: 'Invalid receiving wallet configuration',
      httpStatus: 500,
    };
  }

  const txHash = normalizeTxHash(input.paymentTxHash ?? '');
  if (!txHash) {
    return { ok: false, error: 'Invalid paymentTxHash', httpStatus: 400 };
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

  let fromAddr: `0x${string}`;
  let toAddr: `0x${string}`;
  let usdcAmount: number;

  let spendTx: SpendTransaction | null = null;
  let basePaymentPrepare: SpendPaymentPrepareOperation | null = null;

  {
    const [preparedOp, tx] = await Promise.all([
      getSpendPaymentPrepareBySessionId(session.id),
      getSpendTransactionBySessionId(session.id),
    ]);
    spendTx = tx;
    if (!preparedOp) {
      return {
        ok: false,
        error:
          'Payment is not ready to confirm. Refresh this page to prepare your payment, then complete it in your wallet.',
        httpStatus: 400,
      };
    }
    basePaymentPrepare = preparedOp;

    if (preparedOp.status === 'needs_review') {
      return {
        ok: false,
        error:
          'This payment is under review. Please contact support with your transaction hash if you already sent funds. Do not send another payment.',
        httpStatus: 400,
        details: {
          paymentOperation: spendPaymentOperationClientSummary(preparedOp),
        },
      };
    }

    if (preparedOp.status === 'failed') {
      return {
        ok: false,
        error:
          'Prepare your payment again in this app after a failed attempt, then submit a new transaction from your wallet.',
        httpStatus: 400,
        details: {
          paymentOperation: spendPaymentOperationClientSummary(preparedOp),
        },
      };
    }

    if (preparedOp.status === 'confirmed' && spendTx?.status === 'confirmed') {
      const fresh = await getSpendSessionById(session.id);
      return {
        ok: true,
        spendTransaction: spendTx,
        session: fresh ?? { ...session, status: 'payment_complete' },
        resumed: true,
        paymentOperation: spendPaymentOperationClientSummary(preparedOp),
      };
    }

    const snap = preparedOp.verification_snapshot;
    if (!isSpendBaseUsdcVerificationSnapshotV1(snap)) {
      return {
        ok: false,
        error:
          'Payment is not ready to confirm. Refresh this page to prepare your payment, then complete it in your wallet.',
        httpStatus: 400,
      };
    }
    if (
      !spendBaseUsdcSnapshotMatchesLiveRail({
        snapshot: snap,
        liveSpendRail: session.spend_rail,
        liveReceivingLower: receivingLive.toLowerCase(),
        liveUsdcContractLower:
          getSpendRailBaseUsdcContractAddress().toLowerCase(),
        liveChainId: POSTER_CHECKOUT_CHAIN_ID,
      })
    ) {
      return {
        ok: false,
        error:
          'Payment no longer matches the configured receiving wallet. Refresh this page and try again.',
        httpStatus: 400,
      };
    }
    if (
      snap.usdc_amount !== input.usdcAmount ||
      snap.from_wallet !== normalizedWallet.toLowerCase()
    ) {
      return {
        ok: false,
        error:
          'Payment details do not match this session. Refresh this page and try again.',
        httpStatus: 400,
      };
    }
    fromAddr = snap.from_wallet as `0x${string}`;
    toAddr = snap.receiving_wallet as `0x${string}`;
    usdcAmount = snap.usdc_amount;
  }
  const requestedHashLower = txHash.toLowerCase();

  const paymentHashConflict = async (): Promise<SpendPaymentConfirmResult> => {
    const op = await getSpendPaymentPrepareBySessionId(session.id);
    return {
      ok: false,
      error: 'A different payment is already in progress for this session',
      httpStatus: 409,
      details: op
        ? { paymentOperation: spendPaymentOperationClientSummary(op) }
        : undefined,
    };
  };

  const baseAnalytics: SpendPilotPaymentEventProperties = {
    ...spendPilotRailMixpanelFields(session.spend_rail),
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
    ...(basePaymentPrepare
      ? { spend_payment_prepare_operation_id: basePaymentPrepare.id }
      : {}),
  };

  if (!spendTx) {
    const railGate = assertSpendRailAllowsMutatingSpendWork(session.spend_rail);
    if (!railGate.ok) {
      trackSpendPilotRailMutationBlocked(distinctId, {
        mutation: 'payment_confirm',
        ...railGate.analytics,
        ...spendPilotRailMixpanelFields(session.spend_rail),
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
  }

  if (spendTx?.status === 'confirmed') {
    const fresh = await getSpendSessionById(session.id);
    const prepOp = await getSpendPaymentPrepareBySessionId(session.id);
    return {
      ok: true,
      spendTransaction: spendTx,
      session: fresh ?? { ...session, status: 'payment_complete' },
      resumed: true,
      paymentOperation: prepOp
        ? spendPaymentOperationClientSummary(prepOp)
        : undefined,
    };
  }

  if (spendTx && submittedPaymentHashConflicts(spendTx, requestedHashLower)) {
    return await paymentHashConflict();
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
      toWalletAddress: toAddr.toLowerCase(),
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
    return await paymentHashConflict();
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

  if (session.spend_rail === 'base_usdc' && basePaymentPrepare) {
    const aligned =
      spendTx.status === 'submitted' &&
      (spendTx.payment_tx_hash ?? '').toLowerCase() === requestedHashLower;
    if (aligned) {
      await patchSpendPaymentPrepare(basePaymentPrepare.id, {
        status: 'submitted',
      });
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
    if (session.spend_rail === 'base_usdc' && basePaymentPrepare) {
      const nowIso = new Date().toISOString();
      if (isAmbiguousSpendPaymentVerifyFailure(verify.reason)) {
        const opRow = await patchSpendPaymentPrepare(basePaymentPrepare.id, {
          status: 'needs_review',
          lastFailureReason: verify.reason,
          lastFailureAt: nowIso,
          lastAmbiguityMetadata: {
            spend_transaction_id: spendTx.id,
            verify_reason: verify.reason,
          },
        });
        return {
          ok: false,
          error:
            'We could not fully verify this payment yet. Please contact support with your transaction hash and do not send another payment.',
          httpStatus: 400,
          details: {
            paymentOperation: spendPaymentOperationClientSummary(opRow),
          },
        };
      }
      await patchSpendPaymentPrepare(basePaymentPrepare.id, {
        status: 'failed',
        lastFailureReason: verify.reason,
        lastFailureAt: nowIso,
        lastAmbiguityMetadata: null,
      });
    }

    await finalizeFailure({
      spendTransactionId: spendTx.id,
      sessionId: session.id,
      distinctId,
      analytics: { ...baseAnalytics, spend_transaction_id: spendTx.id },
      reason: verify.reason,
    });

    const opAfter =
      session.spend_rail === 'base_usdc'
        ? await getSpendPaymentPrepareBySessionId(session.id)
        : null;

    return {
      ok: false,
      error:
        'Payment could not be verified on-chain. If funds left your wallet, contact support with your transaction hash.',
      httpStatus: 400,
      details: opAfter
        ? { paymentOperation: spendPaymentOperationClientSummary(opAfter) }
        : undefined,
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

  if (updatedTx?.status === 'confirmed' && basePaymentPrepare) {
    await patchSpendPaymentPrepare(basePaymentPrepare.id, {
      status: 'confirmed',
      lastFailureReason: null,
      lastFailureAt: null,
      lastAmbiguityMetadata: null,
    });
  }

  let paymentOpSummary: SpendPaymentOperationClientSummary | undefined;
  if (session.spend_rail === 'base_usdc') {
    const po = await getSpendPaymentPrepareBySessionId(session.id);
    paymentOpSummary = po ? spendPaymentOperationClientSummary(po) : undefined;
  }

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
      paymentOperation: paymentOpSummary,
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
    paymentOperation: paymentOpSummary,
  };
}

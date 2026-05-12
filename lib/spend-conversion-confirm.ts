import { checkAndTrackTierProgression } from '@/lib/tier-progression';
import { getPlayerByWallet } from '@/lib/db/players';
import {
  confirmSpendConversionAtomic,
  getPointConversionBySessionId,
  getSpendSessionById,
  refundSpendConversionOnFundingFailure,
  updatePointConversionFields,
  updateSpendSessionStatus,
} from '@/lib/db/spend-sessions';
import { getSpendExperienceById } from '@/lib/db/spend-experiences';
import { assertSpendExperienceOpenForSessions } from '@/lib/spend-experience-guard';
import {
  computeConversionAmounts,
  loadSpendEligibilityForSession,
} from '@/lib/spend-conversion-preview';
import { SPEND_ELIGIBILITY_MESSAGES } from '@/lib/spend-eligibility-messages';
import { resolvePrivyServerTransactionHash } from '@/lib/api/privy';
import {
  findRecentTreasuryUsdcTransfer,
  getTreasuryTxReceiptStatus,
  isEvmTxHash,
  submitTreasuryUsdcTransfer,
} from '@/lib/spend-treasury-usdc-transfer';
import {
  fetchServerWalletUsdcBalanceSafe,
  getSpendServerWalletTransferConfig,
} from '@/lib/spend-server-wallet';
import { insertTreasuryFundUserLedgerIfAbsent } from '@/lib/db/treasury-transactions';
import { explorerTxUrlForSpendLedger } from '@/lib/spend-ledger-explorer-url';
import type {
  PointConversion,
  SpendExperience,
  SpendSession,
} from '@/lib/types';
import { recipientUsdcAddressForSpendTransfer } from '@/lib/spend/recipient-usdc-for-treasury-transfer';
import { isEvmAddress } from '@/lib/walletconnect-poster-direct-usdc';
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

const RESUMABLE: PointConversion['status'][] = [
  'points_deducted',
  'funding_pending',
];
const MISCONFIGURED_CONVERSION_ERROR =
  'Conversion is not configured correctly. Please contact support.';
const FUNDING_ACKNOWLEDGED_MESSAGE =
  'USDC transfer submitted. We are confirming it on Base.';

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

export type SpendConversionConfirmResult =
  | {
      ok: true;
      pointConversion: PointConversion;
      session: SpendSession;
      resumed: boolean;
    }
  | {
      ok: false;
      httpStatus: 400 | 401 | 403 | 404 | 409 | 500;
      error: string;
      capture?: boolean;
    };

export async function finalizeSpendConversionFunding(input: {
  pointConversion: PointConversion;
  session: SpendSession;
  spendExperience: SpendExperience;
  serverWalletAddress: string;
  txHash: `0x${string}`;
  distinctId: string;
  baseAnalytics: SpendPilotConversionEventProperties;
}): Promise<PointConversion> {
  const done = await updatePointConversionFields(input.pointConversion.id, {
    status: 'funded',
    completed_at: new Date().toISOString(),
    ...pointConversionFundingHashPatch(input.session, input.txHash),
  });
  void insertTreasuryFundUserLedgerIfAbsent({
    spendExperienceId: input.spendExperience.id,
    spendRail: input.spendExperience.spend_rail,
    amount: done.usdc_amount,
    fromWalletAddress: input.serverWalletAddress,
    toWalletAddress: done.user_wallet_address,
    txHash: input.txHash,
  });
  await markSessionAfterFunding(input.session.id);
  trackSpendConversionCompleted(input.distinctId, {
    ...input.baseAnalytics,
    point_conversion_id: done.id,
    spend_session_id: input.session.id,
    status: 'funded',
    funding_tx_hash: input.txHash,
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

  const serverWallet = getSpendServerWalletTransferConfig(
    input.spendExperience
  );
  if (!serverWallet) return null;

  let hash = pointConversion.funding_tx_hash?.trim() as
    | `0x${string}`
    | undefined;

  if (!hash) {
    const recovered = await findRecentTreasuryUsdcTransfer({
      serverWalletAddress: serverWallet.address,
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
    serverWalletAddress: serverWallet.address,
    txHash: hash,
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

  if (
    pointConversion?.status === 'funded' ||
    pointConversion?.status === 'failed'
  ) {
    if (pointConversion.status === 'funded') {
      await markSessionAfterFunding(session.id);
    }
    const freshSession = await getSpendSessionById(session.id);
    return {
      ok: true,
      pointConversion,
      session: freshSession ?? session,
      resumed: true,
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

  const bal = await fetchServerWalletUsdcBalanceSafe(spendExperience);
  if (bal === null || bal < usdcAmount) {
    trackSpendTreasuryInsufficientFunds(distinctId, {
      ...baseAnalytics,
      status: 'treasury_insufficient',
      error_reason: 'treasury_insufficient_at_confirm',
    });
    return {
      ok: false,
      httpStatus: 400,
      error: SPEND_ELIGIBILITY_MESSAGES.treasury_insufficient,
    };
  }

  const serverWallet = getSpendServerWalletTransferConfig(spendExperience);
  if (!serverWallet) {
    return {
      ok: false,
      httpStatus: 500,
      error: MISCONFIGURED_CONVERSION_ERROR,
    };
  }

  if (!isEvmAddress(session.wallet_address.trim())) {
    return {
      ok: false,
      httpStatus: 400,
      error: 'Invalid wallet for this session.',
    };
  }

  const userRecipient = recipientUsdcAddressForSpendTransfer({
    serverWalletAddress: serverWallet.address,
    sessionWalletTrimmed: session.wallet_address.trim(),
    normalizedWalletLower: normalizedWallet,
  });

  let rpc: Awaited<ReturnType<typeof confirmSpendConversionAtomic>>;
  try {
    rpc = await confirmSpendConversionAtomic({
      spendSessionId: session.id,
      userId: authUserId,
      walletAddress: session.wallet_address,
      spendExperienceId: spendExperience.id,
      pointsToDeduct: pointsRequired,
      usdcAmount,
      treasuryWalletAddress: serverWallet.address,
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

  let conv = (await getPointConversionBySessionId(session.id))!;
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

  const sub = await submitTreasuryUsdcTransfer({
    serverWalletId: serverWallet.walletId,
    serverWalletAddress: serverWallet.address,
    recipientAddress: userRecipient,
    usdcAmount,
  });

  if (!sub.ok) {
    const failReason = sub.error.slice(0, 256);
    try {
      await refundSpendConversionOnFundingFailure({
        conversionId: conv.id,
        userId: authUserId,
        spendSessionId: session.id,
        pointsToRefund: pointsRequired,
        failedReason: failReason,
      });
    } catch (refundErr) {
      console.error('refund after funding failure:', refundErr);
    }
    const failedConv =
      (await getPointConversionBySessionId(session.id)) ?? conv;
    trackSpendConversionFailed(distinctId, {
      ...baseAnalytics,
      point_conversion_id: failedConv.id,
      spend_session_id: session.id,
      status: 'failed',
      error_reason: `funding_submission_failed: ${failReason}`,
    });

    if (failedConv.user_id === authUserId) {
      restoreTierAfterRefund({
        authUserId,
        normalizedWallet,
        balanceAfterDeduction: newPoints,
        pointsRestored: pointsRequired,
      });
    }

    return {
      ok: false,
      httpStatus: 400,
      error: 'USDC transfer could not be sent. Your points have been restored.',
    };
  }

  if ('submittedPending' in sub && sub.submittedPending) {
    const fundingPlaceholder = `pending:${sub.privyTransactionId}`;
    conv = await updatePointConversionFields(conv.id, {
      status: 'funding_pending',
      ...pointConversionFundingHashPatch(session, fundingPlaceholder),
    });
    await updateSpendSessionStatus(session.id, 'conversion_pending');

    return {
      ok: true,
      pointConversion: conv,
      session: (await getSpendSessionById(session.id)) ?? session,
      resumed: rpc.outcome === 'already_exists',
    };
  }

  if (!('txHash' in sub)) {
    return {
      ok: false,
      httpStatus: 500,
      error: 'Unexpected treasury submit response.',
    };
  }

  const txHash = sub.txHash;
  conv = await updatePointConversionFields(conv.id, {
    status: 'funding_pending',
    ...pointConversionFundingHashPatch(session, txHash),
  });
  await updateSpendSessionStatus(session.id, 'conversion_pending');

  return {
    ok: true,
    pointConversion: conv,
    session: (await getSpendSessionById(session.id)) ?? session,
    resumed: rpc.outcome === 'already_exists',
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

  const serverWallet = getSpendServerWalletTransferConfig(spendExperience);
  if (!serverWallet) {
    return {
      error: {
        ok: false,
        httpStatus: 500,
        error: MISCONFIGURED_CONVERSION_ERROR,
      },
    };
  }

  let conv = pointConversion;
  if (conv.status === 'points_deducted' && !conv.funding_tx_hash) {
    const userRecipient = recipientUsdcAddressForSpendTransfer({
      serverWalletAddress: serverWallet.address,
      sessionWalletTrimmed: session.wallet_address.trim(),
      normalizedWalletLower: normalizedWallet,
    });

    const sub = await submitTreasuryUsdcTransfer({
      serverWalletId: serverWallet.walletId,
      serverWalletAddress: serverWallet.address,
      recipientAddress: userRecipient,
      usdcAmount,
    });
    if (!sub.ok) {
      const fail = sub.error.slice(0, 256);
      try {
        await refundSpendConversionOnFundingFailure({
          conversionId: conv.id,
          userId: conv.user_id,
          spendSessionId: session.id,
          pointsToRefund: Math.ceil(Number(conv.points_deducted)),
          failedReason: fail,
        });
      } catch (e) {
        console.error('resume refund failed:', e);
      }
      trackSpendConversionFailed(distinctId, {
        ...baseAnalytics,
        point_conversion_id: conv.id,
        spend_session_id: session.id,
        status: 'failed',
        error_reason: 'funding_submission_failed',
      });

      const p = await getPlayerByWallet(session.wallet_address);
      if (p) {
        const cur = Number(p.total_points ?? 0);
        const refunded = Math.ceil(Number(conv.points_deducted));
        restoreTierAfterRefundResumeOnlyWallet({
          normalizedWallet,
          balanceNow: cur,
          pointsRestored: refunded,
        });
      }
      return {
        error: {
          ok: false,
          httpStatus: 400,
          error:
            'USDC transfer could not be sent. Your points have been restored.',
        },
      };
    }
    if ('submittedPending' in sub && sub.submittedPending) {
      conv = await updatePointConversionFields(conv.id, {
        status: 'funding_pending',
        ...pointConversionFundingHashPatch(
          session,
          `pending:${sub.privyTransactionId}`
        ),
      });
      await updateSpendSessionStatus(session.id, 'conversion_pending');
    } else {
      if (!('txHash' in sub)) {
        return {
          error: {
            ok: false,
            httpStatus: 500,
            error: 'Unexpected treasury submit response.',
          },
        };
      }
      const txHash = sub.txHash;
      conv = await updatePointConversionFields(conv.id, {
        status: 'funding_pending',
        ...pointConversionFundingHashPatch(session, txHash),
      });
      await updateSpendSessionStatus(session.id, 'conversion_pending');
    }
  }

  let hash = conv.funding_tx_hash?.trim() as `0x${string}` | undefined;
  const pendingPrefix = 'pending:';
  const trimmedFunding = conv.funding_tx_hash?.trim() ?? '';
  if (
    !hash &&
    trimmedFunding.startsWith(pendingPrefix) &&
    conv.status === 'funding_pending'
  ) {
    const privyId = trimmedFunding.slice(pendingPrefix.length).trim();
    if (privyId) {
      try {
        const polled = await resolvePrivyServerTransactionHash(
          { transactionId: privyId },
          { timeoutMs: 120_000, pollIntervalMs: 1_000 }
        );
        const normalized = polled?.trim();
        if (normalized && isEvmTxHash(normalized)) {
          hash = normalized as `0x${string}`;
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
  if (!hash && conv.status === 'funding_pending') {
    const recovered = await findRecentTreasuryUsdcTransfer({
      serverWalletAddress: serverWallet.address,
      recipientAddress: session.wallet_address as `0x${string}`,
      usdcAmount: Number(conv.usdc_amount),
    });
    hash = recovered ?? undefined;
    if (hash) {
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
        error: FUNDING_ACKNOWLEDGED_MESSAGE,
      } as SpendConversionConfirmResult,
    };
  }

  const receiptStatus = await getTreasuryTxReceiptStatus(hash);
  if (receiptStatus === 'reverted') {
    try {
      await refundSpendConversionOnFundingFailure({
        conversionId: conv.id,
        userId: conv.user_id,
        spendSessionId: session.id,
        pointsToRefund: Math.ceil(Number(conv.points_deducted)),
        failedReason: 'funding transaction reverted',
      });
    } catch (r) {
      console.error('resume wait refund:', r);
    }
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
        error: FUNDING_ACKNOWLEDGED_MESSAGE,
      },
    };
  }

  const done = await finalizeSpendConversionFunding({
    pointConversion: conv,
    session,
    spendExperience,
    serverWalletAddress: serverWallet.address,
    txHash: hash,
    distinctId,
    baseAnalytics,
  });

  return { conversion: done, error: null };
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

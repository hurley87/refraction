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
  fetchTreasuryUsdcBalanceSafe,
  loadSpendEligibilityForSession,
} from '@/lib/spend-conversion-preview';
import { SPEND_ELIGIBILITY_MESSAGES } from '@/lib/spend-eligibility-messages';
import { getServerWalletAddress } from '@/lib/spend-treasury-usdc-transfer';
import {
  submitTreasuryUsdcTransfer,
  waitForTreasuryTxReceipt,
} from '@/lib/spend-treasury-usdc-transfer';
import type {
  PointConversion,
  SpendExperience,
  SpendSession,
} from '@/lib/types';
import { isEvmAddress } from '@/lib/walletconnect-poster-direct-usdc';
import {
  resolveServerIdentity,
  trackSpendConversionCompleted,
  trackSpendConversionConfirmed,
  trackSpendConversionFailed,
  trackSpendTreasuryInsufficientFunds,
} from '@/lib/analytics/server';
import type { SpendPilotConversionEventProperties } from '@/lib/analytics/types';

const RESUMABLE: PointConversion['status'][] = [
  'points_deducted',
  'funding_pending',
];

type ConfirmContext = {
  session: SpendSession;
  spendExperience: SpendExperience;
  normalizedWallet: string;
  authUserId: string;
  distinctId: string;
  usdcAmount: number;
  pointsRequired: number;
};

function assertServerTreasuryMatchesExperience(
  experience: SpendExperience
):
  | { ok: true; serverAddress: `0x${string}` }
  | { ok: false; userMessage: string } {
  const serverAddress = getServerWalletAddress();
  if (!serverAddress) {
    return { ok: false, userMessage: 'Conversion is temporarily unavailable.' };
  }
  const expected = experience.treasury_wallet_address.trim().toLowerCase();
  const actual = serverAddress.toLowerCase();
  if (expected !== actual) {
    console.error(
      'Treasury address mismatch: experience expects',
      expected,
      'server key derives',
      actual
    );
    return {
      ok: false,
      userMessage:
        'Conversion is not configured correctly. Please contact support.',
    };
  }
  return { ok: true, serverAddress };
}

/**
 * After successful conversion funding, set session to `conversion_complete` (PRD §11).
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
    };

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

  const player = await getPlayerByWallet(normalizedWallet);
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
    return {
      ok: false,
      httpStatus: 400,
      error: eligibility.message,
    };
  }

  const bal = await fetchTreasuryUsdcBalanceSafe(
    spendExperience.treasury_wallet_address
  );
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

  const treasuryCheck = assertServerTreasuryMatchesExperience(spendExperience);
  if (!treasuryCheck.ok) {
    return {
      ok: false,
      httpStatus: 500,
      error: treasuryCheck.userMessage,
    };
  }

  if (!isEvmAddress(session.wallet_address.trim())) {
    return {
      ok: false,
      httpStatus: 400,
      error: 'Invalid wallet for this session.',
    };
  }

  const recipient = session.wallet_address.trim() as `0x${string}`;

  let rpc: Awaited<ReturnType<typeof confirmSpendConversionAtomic>>;
  try {
    rpc = await confirmSpendConversionAtomic({
      spendSessionId: session.id,
      userId: authUserId,
      walletAddress: normalizedWallet,
      spendExperienceId: spendExperience.id,
      pointsToDeduct: pointsRequired,
      usdcAmount,
      treasuryWalletAddress: spendExperience.treasury_wallet_address,
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
      return { ok: false, httpStatus: 400, error: msg };
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

  const userRecipient =
    spendExperience.treasury_wallet_address.trim().toLowerCase() ===
    recipient.toLowerCase()
      ? (normalizedWallet as `0x${string}`)
      : recipient;

  const sub = await submitTreasuryUsdcTransfer({
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
      const distinct = resolveServerIdentity({
        privyUserId: authUserId,
        walletAddress: normalizedWallet,
      });
      void checkAndTrackTierProgression(
        distinct,
        newPoints,
        newPoints + pointsRequired
      );
    }

    return {
      ok: false,
      httpStatus: 400,
      error: 'USDC transfer could not be sent. Your points have been restored.',
    };
  }

  const txHash = sub.txHash;
  conv = await updatePointConversionFields(conv.id, {
    status: 'funding_pending',
    funding_tx_hash: txHash,
  });
  await updateSpendSessionStatus(session.id, 'conversion_pending');

  try {
    await waitForTreasuryTxReceipt(txHash);
  } catch (waitErr) {
    const wmsg =
      waitErr instanceof Error ? waitErr.message : 'receipt wait failed';
    try {
      await refundSpendConversionOnFundingFailure({
        conversionId: conv.id,
        userId: authUserId,
        spendSessionId: session.id,
        pointsToRefund: pointsRequired,
        failedReason: wmsg.slice(0, 200),
      });
    } catch (refundErr) {
      console.error('refund after wait failure:', refundErr);
    }
    const after = (await getPointConversionBySessionId(session.id)) ?? conv;
    trackSpendConversionFailed(distinctId, {
      ...baseAnalytics,
      point_conversion_id: after.id,
      spend_session_id: session.id,
      status: 'failed',
      error_reason: `funding_receipt_timeout: ${wmsg}`,
    });

    if (after.user_id === authUserId) {
      const distinct = resolveServerIdentity({
        privyUserId: authUserId,
        walletAddress: normalizedWallet,
      });
      void checkAndTrackTierProgression(
        distinct,
        newPoints,
        newPoints + pointsRequired
      );
    }
    return {
      ok: false,
      httpStatus: 400,
      error:
        'The funding transaction could not be confirmed. Your points have been restored.',
    };
  }

  const completed = await updatePointConversionFields(conv.id, {
    status: 'funded',
    completed_at: new Date().toISOString(),
  });
  await markSessionAfterFunding(session.id);
  trackSpendConversionCompleted(distinctId, {
    ...baseAnalytics,
    point_conversion_id: completed.id,
    spend_session_id: session.id,
    status: 'funded',
    funding_tx_hash: txHash,
  });

  return {
    ok: true,
    pointConversion: completed,
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

  const tre = assertServerTreasuryMatchesExperience(spendExperience);
  if (!tre.ok) {
    return {
      error: {
        ok: false,
        httpStatus: 500,
        error: tre.userMessage,
      },
    };
  }

  let conv = pointConversion;
  if (conv.status === 'points_deducted' && !conv.funding_tx_hash) {
    const recipient = session.wallet_address.trim() as `0x${string}`;
    const userRecipient =
      spendExperience.treasury_wallet_address.trim().toLowerCase() ===
      recipient.toLowerCase()
        ? (normalizedWallet as `0x${string}`)
        : recipient;

    const sub = await submitTreasuryUsdcTransfer({
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

      const p = await getPlayerByWallet(normalizedWallet);
      if (p) {
        const cur = Number(p.total_points ?? 0);
        void checkAndTrackTierProgression(
          resolveServerIdentity({ walletAddress: normalizedWallet }),
          cur,
          cur + Math.ceil(Number(conv.points_deducted))
        );
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
    const txHash = sub.txHash;
    conv = await updatePointConversionFields(conv.id, {
      status: 'funding_pending',
      funding_tx_hash: txHash,
    });
    await updateSpendSessionStatus(session.id, 'conversion_pending');
  }

  const hash = (conv.funding_tx_hash ?? null) as `0x${string}` | null;
  if (!hash) {
    return {
      error: {
        ok: false,
        httpStatus: 500,
        error: 'Missing funding transaction',
      } as SpendConversionConfirmResult,
    };
  }

  try {
    await waitForTreasuryTxReceipt(hash);
  } catch (e) {
    const wmsg = e instanceof Error ? e.message : 'receipt error';
    try {
      await refundSpendConversionOnFundingFailure({
        conversionId: conv.id,
        userId: conv.user_id,
        spendSessionId: session.id,
        pointsToRefund: Math.ceil(Number(conv.points_deducted)),
        failedReason: wmsg.slice(0, 200),
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

  const done = await updatePointConversionFields(conv.id, {
    status: 'funded',
    completed_at: new Date().toISOString(),
  });
  await markSessionAfterFunding(session.id);
  trackSpendConversionCompleted(distinctId, {
    ...baseAnalytics,
    point_conversion_id: done.id,
    spend_session_id: session.id,
    status: 'funded',
    funding_tx_hash: hash,
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

import {
  MAX_SPEND_CONVERSION_POINT_DEDUCTION_ATTEMPTS,
  SPEND_ELIGIBILITY_MESSAGES,
  SPEND_STELLAR_TREASURY_INSUFFICIENT_MESSAGE,
  type SpendEligibilityStatus,
} from '@/lib/spend-eligibility-messages';
import {
  fetchUsdcBalanceOnBase,
  isEvmAddress,
} from '@/lib/walletconnect-poster-direct-usdc';
import {
  getSpendRailBaseRpcUrl,
  getSpendRailBaseUsdcContractAddress,
  getSpendRailOperationalDiagnostics,
  getSpendRailPublicMetadata,
  getSpendReceivingWalletAddress,
  getSpendTreasuryWalletAddress,
} from '@/lib/spend-rail-config';
import { assertSpendExperienceOpenForSessions } from '@/lib/spend-experience-guard';
import {
  okSpendRail,
  type SpendRailResult,
} from '@/lib/spend/payment-rails/spend-payment-rail';
import type {
  PointConversion,
  Player,
  SpendExperience,
  SpendSession,
  SpendTransaction,
} from '@/lib/types';
import { getPlayerByWallet } from '@/lib/db/players';
import {
  getFundedPointConversionForUserExperience,
  getPointConversionBySessionId,
  getSpendTransactionBySessionId,
} from '@/lib/db/spend-sessions';

export type { SpendEligibilityStatus } from '@/lib/spend-eligibility-messages';
export { SPEND_ELIGIBILITY_MESSAGES } from '@/lib/spend-eligibility-messages';

async function getTreasurySpendableBalanceForSpendEligibility(
  spendExperience: Pick<SpendExperience, 'spend_rail'>
): Promise<SpendRailResult<number | null>> {
  if (spendExperience.spend_rail === 'stellar_usdc') {
    const { createStellarUsdcSpendPaymentRail } =
      await import('@/lib/spend/payment-rails/stellar-usdc-rail');
    return createStellarUsdcSpendPaymentRail().getTreasurySpendableBalance();
  }
  const { fetchServerWalletUsdcBalanceSafe } =
    await import('@/lib/spend-server-wallet');
  const b = await fetchServerWalletUsdcBalanceSafe(spendExperience);
  return okSpendRail(b);
}

const IN_PROGRESS: PointConversion['status'][] = [
  'pending',
  'points_deducted',
  'funding_pending',
  'needs_review',
];

export type SpendConversionPreview = {
  pointsRequired: number;
  usdcAmount: number;
  receivingWalletAddress: string;
  treasuryWalletAddress: string;
  userPointsBalance: number | null;
  /** Wallet USDC balance on the active spend rail (null if unavailable). */
  userUsdcBalance: number | null;
  treasuryUsdcBalance: number | null;
};

export type SpendEligibilityResult = {
  status: SpendEligibilityStatus;
  message: string;
  preview: SpendConversionPreview | null;
};

type BuildPreviewInput = {
  session: SpendSession;
  spendExperience: SpendExperience;
  player: Player | null;
  pointConversion: PointConversion | null;
  spendTransaction: SpendTransaction | null;
  /** Funded conversion for same user+experience on a different session (one per user). */
  fundedConversionForOtherSession: PointConversion | null;
  treasuryUsdcBalance: number | null;
  userUsdcBalance: number | null;
  now: Date;
};

function spendRailSupportsPointsToUsdcConversion(
  spendRail: SpendExperience['spend_rail']
): boolean {
  return spendRail === 'base_usdc' || spendRail === 'stellar_usdc';
}

/**
 * Computes max USDC and required points for a spend experience (pilot: full max per user).
 */
export function computeConversionAmounts(experience: SpendExperience): {
  usdcAmount: number;
  pointsRequired: number;
} {
  const usdcAmount = Number(experience.max_usdc_per_user);
  const rate = Number(experience.points_to_usdc_rate);
  const pointsRequired = Math.ceil(usdcAmount * rate);
  return { usdcAmount, pointsRequired };
}

/**
 * Server-side eligibility + preview for spend pilot conversion (PRD §7–§8).
 */
export function buildSpendEligibilityPreview(
  input: BuildPreviewInput
): SpendEligibilityResult {
  const {
    session,
    spendExperience,
    player,
    pointConversion,
    spendTransaction,
    fundedConversionForOtherSession,
    treasuryUsdcBalance,
    userUsdcBalance,
    now,
  } = input;

  const { usdcAmount, pointsRequired } =
    computeConversionAmounts(spendExperience);

  const railPublic = getSpendRailPublicMetadata(spendExperience.spend_rail);
  const { networkLabel, assetSymbol: railAssetSymbol } = railPublic;

  const treasuryInsufficientMessage =
    spendExperience.spend_rail === 'stellar_usdc'
      ? SPEND_STELLAR_TREASURY_INSUFFICIENT_MESSAGE
      : SPEND_ELIGIBILITY_MESSAGES.treasury_insufficient;

  const basePreview = (): SpendConversionPreview => ({
    pointsRequired,
    usdcAmount,
    receivingWalletAddress: getSpendReceivingWalletAddress(
      spendExperience.spend_rail
    ),
    treasuryWalletAddress: getSpendTreasuryWalletAddress(
      spendExperience.spend_rail
    ),
    userPointsBalance:
      player?.total_points != null ? Number(player.total_points) : null,
    userUsdcBalance,
    treasuryUsdcBalance,
  });

  const railDiag = getSpendRailOperationalDiagnostics(session.spend_rail);
  /** Confirmed on-chain payment: receipt/read paths stay accurate if the rail is later disabled. */
  const completedPaymentReadBypass =
    !railDiag.operational &&
    spendTransaction?.status === 'confirmed' &&
    !!(spendTransaction.payment_tx_hash ?? '').trim();

  if (now > new Date(session.expires_at) && !completedPaymentReadBypass) {
    return {
      status: 'session_expired',
      message: SPEND_ELIGIBILITY_MESSAGES.session_expired,
      preview: null,
    };
  }

  if (!railDiag.operational && !completedPaymentReadBypass) {
    return {
      status: 'rail_unavailable',
      message: SPEND_ELIGIBILITY_MESSAGES.rail_unavailable,
      preview: basePreview(),
    };
  }

  const gate = assertSpendExperienceOpenForSessions(spendExperience, now);
  if (!gate.ok && !completedPaymentReadBypass) {
    return {
      status: 'experience_inactive',
      message: SPEND_ELIGIBILITY_MESSAGES.experience_inactive,
      preview: null,
    };
  }

  if (fundedConversionForOtherSession) {
    return {
      status: 'already_converted',
      message: SPEND_ELIGIBILITY_MESSAGES.already_converted,
      preview: basePreview(),
    };
  }

  if (pointConversion?.status === 'funded') {
    if (
      spendTransaction?.status === 'confirmed' ||
      session.status === 'payment_complete'
    ) {
      return {
        status: 'payment_complete',
        message: `Your ${railAssetSymbol} payment on ${networkLabel} was received. You are all set for this event.`,
        preview: basePreview(),
      };
    }
    if (spendTransaction?.status === 'failed') {
      return {
        status: 'payment_failed',
        message: `Your last ${railAssetSymbol} payment on ${networkLabel} could not be verified on-chain. You can try sending payment again.`,
        preview: basePreview(),
      };
    }
    return {
      status: 'ready_for_payment',
      message: `Your points were converted to ${railAssetSymbol} on ${networkLabel}.`,
      preview: basePreview(),
    };
  }

  if (pointConversion?.status === 'failed') {
    const attempts = pointConversion.conversion_attempt_count;
    if (attempts >= MAX_SPEND_CONVERSION_POINT_DEDUCTION_ATTEMPTS) {
      return {
        status: 'conversion_failed_retry_exhausted',
        message: SPEND_ELIGIBILITY_MESSAGES.conversion_failed_retry_exhausted,
        preview: basePreview(),
      };
    }
    const balance =
      player?.total_points != null ? Number(player.total_points) : 0;
    if (balance < pointsRequired) {
      return {
        status: 'insufficient_points',
        message: SPEND_ELIGIBILITY_MESSAGES.insufficient_points,
        preview: basePreview(),
      };
    }
    if (!spendRailSupportsPointsToUsdcConversion(spendExperience.spend_rail)) {
      return {
        status: 'conversion_unsupported',
        message: SPEND_ELIGIBILITY_MESSAGES.conversion_unsupported,
        preview: basePreview(),
      };
    }
    if (treasuryUsdcBalance === null || treasuryUsdcBalance < usdcAmount) {
      return {
        status: 'treasury_insufficient',
        message: treasuryInsufficientMessage,
        preview: basePreview(),
      };
    }
    return {
      status: 'conversion_failed_retryable',
      message: SPEND_ELIGIBILITY_MESSAGES.conversion_failed_retryable,
      preview: basePreview(),
    };
  }

  if (pointConversion && IN_PROGRESS.includes(pointConversion.status)) {
    return {
      status: 'conversion_in_progress',
      message: SPEND_ELIGIBILITY_MESSAGES.conversion_in_progress,
      preview: basePreview(),
    };
  }

  const userHasEnoughUsdc =
    userUsdcBalance !== null && userUsdcBalance >= usdcAmount;
  if (userHasEnoughUsdc) {
    return {
      status: 'ready_for_payment_own_usdc',
      message: `You have enough ${railAssetSymbol} in your wallet on ${networkLabel} to complete this payment.`,
      preview: basePreview(),
    };
  }

  const balance =
    player?.total_points != null ? Number(player.total_points) : 0;

  /** Points→USDC conversion is supported only on rails that implement treasury funding. */
  if (
    !spendRailSupportsPointsToUsdcConversion(spendExperience.spend_rail) &&
    balance >= pointsRequired
  ) {
    return {
      status: 'conversion_unsupported',
      message: SPEND_ELIGIBILITY_MESSAGES.conversion_unsupported,
      preview: basePreview(),
    };
  }

  if (balance < pointsRequired) {
    return {
      status: 'insufficient_points',
      message: SPEND_ELIGIBILITY_MESSAGES.insufficient_points,
      preview: basePreview(),
    };
  }

  if (treasuryUsdcBalance === null || treasuryUsdcBalance < usdcAmount) {
    return {
      status: 'treasury_insufficient',
      message: treasuryInsufficientMessage,
      preview: basePreview(),
    };
  }

  return {
    status: 'eligible',
    message: `You can convert your points to ${railAssetSymbol} on ${networkLabel} for this event.`,
    preview: basePreview(),
  };
}

type LoadEligibilityInput = {
  session: SpendSession;
  spendExperience: SpendExperience;
  now?: Date;
};

/**
 * Loads player, treasury balance, conversions, and builds eligibility (for API routes).
 */
export async function fetchUserUsdcBalanceSafe(
  walletAddress: string
): Promise<number | null> {
  const trimmed = walletAddress.trim();
  if (!isEvmAddress(trimmed)) return null;
  try {
    return await fetchUsdcBalanceOnBase(trimmed as `0x${string}`, {
      rpcUrl: getSpendRailBaseRpcUrl(),
      usdcContract: getSpendRailBaseUsdcContractAddress(),
    });
  } catch (e) {
    console.error('fetchUserUsdcBalanceSafe:', e);
    return null;
  }
}

export async function loadSpendEligibilityForSession(
  input: LoadEligibilityInput
): Promise<SpendEligibilityResult> {
  const now = input.now ?? new Date();
  const session = input.session;
  const spendExperience = input.spendExperience;

  const tb =
    await getTreasurySpendableBalanceForSpendEligibility(spendExperience);

  if (!tb.ok && spendExperience.spend_rail === 'stellar_usdc') {
    return {
      status: 'rail_unavailable',
      message: SPEND_ELIGIBILITY_MESSAGES.rail_unavailable,
      preview: null,
    };
  }

  const treasuryUsdcBalance = tb.ok ? tb.value : null;

  const [player, pointConversion, fundedOther, spendTx, userUsdcBalance] =
    await Promise.all([
      getPlayerByWallet(session.wallet_address),
      getPointConversionBySessionId(session.id),
      getFundedPointConversionForUserExperience(
        spendExperience.id,
        session.user_id
      ),
      getSpendTransactionBySessionId(session.id),
      fetchUserUsdcBalanceSafe(session.wallet_address),
    ]);

  return buildSpendEligibilityPreview({
    session,
    spendExperience,
    player,
    pointConversion,
    spendTransaction: spendTx,
    fundedConversionForOtherSession:
      fundedOther && fundedOther.spend_session_id !== session.id
        ? fundedOther
        : null,
    treasuryUsdcBalance,
    userUsdcBalance,
    now,
  });
}

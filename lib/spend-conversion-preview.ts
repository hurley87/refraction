import {
  SPEND_ELIGIBILITY_MESSAGES,
  type SpendEligibilityStatus,
} from '@/lib/spend-eligibility-messages';
import { fetchServerWalletUsdcBalanceSafe } from '@/lib/spend-server-wallet';
import {
  fetchUsdcBalanceOnBase,
  isEvmAddress,
} from '@/lib/walletconnect-poster-direct-usdc';
import {
  getSpendRailBaseRpcUrl,
  getSpendRailBaseUsdcContractAddress,
  getSpendRailOperationalDiagnostics,
  getSpendReceivingWalletAddress,
  getSpendTreasuryWalletAddress,
  supportsSpendRailBasePrivyTreasuryFunding,
} from '@/lib/spend-rail-config';
import { assertSpendExperienceOpenForSessions } from '@/lib/spend-experience-guard';
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

const IN_PROGRESS: PointConversion['status'][] = [
  'pending',
  'points_deducted',
  'funding_pending',
];

export type SpendConversionPreview = {
  pointsRequired: number;
  usdcAmount: number;
  receivingWalletAddress: string;
  treasuryWalletAddress: string;
  userPointsBalance: number | null;
  /** Embedded wallet USDC on Base (null if unavailable). */
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
        message: SPEND_ELIGIBILITY_MESSAGES.payment_complete,
        preview: basePreview(),
      };
    }
    if (spendTransaction?.status === 'failed') {
      return {
        status: 'payment_failed',
        message: SPEND_ELIGIBILITY_MESSAGES.payment_failed,
        preview: basePreview(),
      };
    }
    return {
      status: 'ready_for_payment',
      message: SPEND_ELIGIBILITY_MESSAGES.ready_for_payment,
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
      message: SPEND_ELIGIBILITY_MESSAGES.ready_for_payment_own_usdc,
      preview: basePreview(),
    };
  }

  const balance =
    player?.total_points != null ? Number(player.total_points) : 0;

  /** Points→USDC via Privy treasury exists only on `base_usdc` today. */
  if (
    !supportsSpendRailBasePrivyTreasuryFunding(spendExperience.spend_rail) &&
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
      message: SPEND_ELIGIBILITY_MESSAGES.treasury_insufficient,
      preview: basePreview(),
    };
  }

  return {
    status: 'eligible',
    message: SPEND_ELIGIBILITY_MESSAGES.eligible,
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

  const [
    player,
    pointConversion,
    fundedOther,
    treasuryUsdcBalance,
    spendTx,
    userUsdcBalance,
  ] = await Promise.all([
    getPlayerByWallet(session.wallet_address),
    getPointConversionBySessionId(session.id),
    getFundedPointConversionForUserExperience(
      spendExperience.id,
      session.user_id
    ),
    fetchServerWalletUsdcBalanceSafe(spendExperience),
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

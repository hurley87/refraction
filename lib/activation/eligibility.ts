import { resolveTierForPoints } from '@/lib/db/tiers';
import type { ActivationEligibilityRulesConfig } from '@/lib/schemas/activation-eligibility-config';
import type { SponsoredActivationUserEligibilitySource } from '@/lib/schemas/activation-eligibility';
import type { ActivationRedemptionStatus } from '@/lib/schemas/activation-redemption';
import type { Tier } from '@/lib/types';

const TERMINAL_REDEMPTION_STATUSES = new Set<ActivationRedemptionStatus>([
  'redeemed',
  'settlement_confirmed',
  'cancelled',
  'expired',
  'settlement_failed',
]);

export function isBlockingActivationRedemptionStatus(
  status: ActivationRedemptionStatus
): boolean {
  return !TERMINAL_REDEMPTION_STATUSES.has(status);
}

export function userHasBlockingRedemptionForRewardItem(
  redemptions: { reward_item_id: string; status: ActivationRedemptionStatus }[],
  rewardItemId: string
): boolean {
  return redemptions.some(
    (r) =>
      r.reward_item_id === rewardItemId &&
      isBlockingActivationRedemptionStatus(r.status)
  );
}

export function buildActivationRedemptionIdempotencyKey(input: {
  activationId: string;
  playerId: number;
  rewardItemId: string;
}): string {
  return `${input.activationId}:${input.playerId}:${input.rewardItemId}`;
}

/**
 * 1-based tier rank using `tiers` rows ordered ascending by `min_points` (same order as `getTiers()`).
 */
export function computePlayerTierRank(
  tiersSortedAsc: Tier[],
  totalPoints: number
): number | null {
  const tier = resolveTierForPoints(tiersSortedAsc, totalPoints);
  if (!tier) return null;
  const idx = tiersSortedAsc.findIndex((t) => t.id === tier.id);
  return idx >= 0 ? idx + 1 : null;
}

export function evaluateEligibilityBusinessRules(input: {
  config: ActivationEligibilityRulesConfig;
  source: SponsoredActivationUserEligibilitySource;
  sourceRefId: string;
  tiersSortedAsc: Tier[];
  playerTotalPoints: number;
}): { ok: true } | { ok: false; reason: string } {
  if (input.source === 'checkpoint_checkin') {
    if (!input.config.required_checkpoint_ids.includes(input.sourceRefId)) {
      return { ok: false, reason: 'checkpoint_requirement_not_met' };
    }
  }

  if (input.config.min_tier != null) {
    const rank = computePlayerTierRank(
      input.tiersSortedAsc,
      input.playerTotalPoints
    );
    if (rank == null || rank < input.config.min_tier) {
      return { ok: false, reason: 'tier_requirement_not_met' };
    }
  }

  return { ok: true };
}

export type EligibilityRateLimitCheck =
  | 'ok'
  | 'lifetime_exceeded'
  | 'daily_exceeded';

/**
 * Compares current persisted event counts (before inserting a new row) to config caps.
 */
export function checkEligibilityEventRateLimits(input: {
  config: ActivationEligibilityRulesConfig;
  lifetimeCountBeforeInsert: number;
  dailyCountBeforeInsert: number;
}): EligibilityRateLimitCheck {
  if (input.lifetimeCountBeforeInsert >= input.config.max_events_per_user) {
    return 'lifetime_exceeded';
  }
  if (
    input.dailyCountBeforeInsert >= input.config.max_events_per_user_per_day
  ) {
    return 'daily_exceeded';
  }
  return 'ok';
}

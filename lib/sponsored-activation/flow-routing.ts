import type { ActivationRedemptionRow } from '@/lib/db/activation-redemptions';
import type { ActivationRedemptionStatus } from '@/lib/schemas/activation-redemption';

const REDEEMED_LIKE_STATUSES = new Set<ActivationRedemptionStatus>([
  'redeemed',
  'settlement_pending',
  'settlement_confirmed',
  'settlement_failed',
]);

const READY_FOR_VENUE_STATUSES = new Set<ActivationRedemptionStatus>([
  'ready_to_redeem',
  'purchase_confirmed',
]);

const CONFIRM_STATUSES = new Set<ActivationRedemptionStatus>([
  'available',
  'eligible',
]);

export type SponsoredActivationBaseScreen =
  | 'confirm'
  | 'success_swipe'
  | 'redeemed'
  | 'expired'
  | 'cancelled';

/**
 * Maps redemption status to the primary full-screen step (before local Success vs Swipe split).
 */
export function resolveSponsoredActivationBaseScreen(
  status: ActivationRedemptionStatus | undefined
): SponsoredActivationBaseScreen | 'unknown' {
  if (!status) return 'unknown';
  if (status === 'expired') return 'expired';
  if (status === 'cancelled') return 'cancelled';
  if (REDEEMED_LIKE_STATUSES.has(status)) return 'redeemed';
  if (READY_FOR_VENUE_STATUSES.has(status)) return 'success_swipe';
  if (CONFIRM_STATUSES.has(status)) return 'confirm';
  return 'unknown';
}

export function isRedeemedLikeStatus(
  status: ActivationRedemptionStatus | undefined
): boolean {
  return status != null && REDEEMED_LIKE_STATUSES.has(status);
}

export function isSwipeAllowedForStatus(
  status: ActivationRedemptionStatus | undefined
): boolean {
  return status != null && READY_FOR_VENUE_STATUSES.has(status);
}

function redemptionStatusPriority(status: ActivationRedemptionStatus): number {
  if (REDEEMED_LIKE_STATUSES.has(status)) return 50;
  if (READY_FOR_VENUE_STATUSES.has(status)) return 40;
  if (status === 'expired') return 30;
  if (status === 'cancelled') return 20;
  if (CONFIRM_STATUSES.has(status)) return 10;
  return 0;
}

/** Pilot: single reward item — pick the highest-priority redemption row for that item. */
export function pickPrimaryActivationRedemption(
  redemptions: ActivationRedemptionRow[],
  rewardItemId: string
): ActivationRedemptionRow | null {
  const matches = redemptions.filter((r) => r.reward_item_id === rewardItemId);
  if (!matches.length) return null;
  return [...matches].sort(
    (a, b) =>
      redemptionStatusPriority(b.status) - redemptionStatusPriority(a.status)
  )[0];
}

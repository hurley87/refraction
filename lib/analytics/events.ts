/**
 * Mixpanel event name constants
 * Centralized event names to ensure consistency across the app
 */

export const ANALYTICS_EVENTS = {
  // City & Map Metrics
  LOCATION_CREATED: 'location_created',

  // Interest
  ACCOUNT_CREATED: 'account_created',

  // Conversion
  CHECKIN_COMPLETED: 'checkin_completed',
  USER_ACTIVE: 'user_active',

  // Retention
  SESSION_STARTED: 'session_started',

  // Loyalty & Value
  REWARD_PAGE_VIEWED: 'reward_page_viewed',
  /** User clicked a "Claim Reward" CTA (intent). Distinct from `reward_claimed` (successful redemption). */
  REWARD_CLAIM_CLICKED: 'reward_claim_clicked',
  REWARD_CLAIMED: 'reward_claimed',

  // Token / Points
  POINTS_EARNED: 'points_earned',
  SPEND_REDEMPTION_STARTED: 'spend_redemption_started',
  SPEND_REDEMPTION_COMPLETED: 'spend_redemption_completed',

  // User Structure
  TIER_CHANGED: 'tier_changed',
  TIER_PROGRESSION: 'tier_progression',

  // City Growth
  CITY_MILESTONE: 'city_milestone',

  // Page Views (automatically tracked)
  PAGE_VIEW: '$pageview',

  // Spend pilot (IRL points → USDC)
  SPEND_EXPERIENCE_QR_VIEWED_BY_ADMIN: 'spend_experience_qr_viewed_by_admin',
  SPEND_EXPERIENCE_QR_SCANNED: 'spend_experience_qr_scanned',
  SPEND_SESSION_CREATED: 'spend_session_created',
  SPEND_CONVERSION_PREVIEWED: 'spend_conversion_previewed',
  SPEND_USER_ALREADY_CONVERTED: 'spend_user_already_converted',
  SPEND_TREASURY_INSUFFICIENT_FUNDS: 'spend_treasury_insufficient_funds',
  SPEND_CONVERSION_CONFIRMED: 'spend_conversion_confirmed',
  SPEND_CONVERSION_COMPLETED: 'spend_conversion_completed',
  SPEND_CONVERSION_FAILED: 'spend_conversion_failed',
  SPEND_PAYMENT_CONFIRMED: 'spend_payment_confirmed',
  SPEND_PAYMENT_COMPLETED: 'spend_payment_completed',
  SPEND_PAYMENT_FAILED: 'spend_payment_failed',
  SPEND_RECEIPT_VIEWED: 'spend_receipt_viewed',
  /** Spend rail disabled/misconfigured blocked a mutating API path (IRL-10). */
  SPEND_PILOT_RAIL_MUTATION_BLOCKED: 'spend_pilot_rail_mutation_blocked',
  /** Wallet readiness funnel (IRL-23): Base = sync validation; Stellar = async orchestration. */
  SPEND_WALLET_READINESS_STARTED: 'spend_wallet_readiness_started',
  SPEND_WALLET_READINESS_COMPLETED: 'spend_wallet_readiness_completed',
  SPEND_WALLET_READINESS_FAILED: 'spend_wallet_readiness_failed',

  /** Public Records sponsored activation funnel (IRL-61). */
  SPONSORED_ACTIVATION_VIEWED: 'sponsored_activation_viewed',
  SPONSORED_ACTIVATION_ELIGIBILITY_RECORDED:
    'sponsored_activation_eligibility_recorded',
  SPONSORED_REDEMPTION_CONFIRM_VIEWED: 'sponsored_redemption_confirm_viewed',
  SPONSORED_REDEMPTION_PURCHASE_CONFIRMED:
    'sponsored_redemption_purchase_confirmed',
  SPONSORED_REDEMPTION_SWIPE_STARTED: 'sponsored_redemption_swipe_started',
  SPONSORED_REDEMPTION_REDEEMED: 'sponsored_redemption_redeemed',
  SPONSORED_REDEMPTION_CANCELLED: 'sponsored_redemption_cancelled',
  SPONSORED_REDEMPTION_EXPIRED: 'sponsored_redemption_expired',
  SPONSORED_SETTLEMENT_QUEUED: 'sponsored_settlement_queued',
  SPONSORED_SETTLEMENT_SUBMITTED: 'sponsored_settlement_submitted',
  SPONSORED_SETTLEMENT_CONFIRMED: 'sponsored_settlement_confirmed',
  SPONSORED_SETTLEMENT_FAILED: 'sponsored_settlement_failed',
  SPONSORED_ACTIVATION_CAP_REACHED: 'sponsored_activation_cap_reached',

  /** Admin ops dashboard for sponsored activations (IRL-62 / FR-9). */
  SPONSORED_ACTIVATION_ADMIN_DASHBOARD_VIEWED:
    'sponsored_activation_admin_dashboard_viewed',
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

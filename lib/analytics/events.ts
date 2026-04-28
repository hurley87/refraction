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
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

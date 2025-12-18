/**
 * Mixpanel event name constants
 * Centralized event names to ensure consistency across the app
 */

export const ANALYTICS_EVENTS = {
  // City & Map Metrics
  LOCATION_CREATED: "location_created",

  // Interest
  ACCOUNT_CREATED: "account_created",

  // Conversion
  CHECKIN_COMPLETED: "checkin_completed",
  USER_ACTIVE: "user_active",

  // Retention
  SESSION_STARTED: "session_started",

  // Loyalty & Value
  REWARD_PAGE_VIEWED: "reward_page_viewed",
  REWARD_CLAIMED: "reward_claimed",

  // Token / Points
  POINTS_EARNED: "points_earned",

  // User Structure
  TIER_CHANGED: "tier_changed",

  // Page Views (automatically tracked)
  PAGE_VIEW: "$pageview",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];


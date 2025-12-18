/**
 * Analytics module exports
 * Centralized analytics functionality for Mixpanel integration
 */

// Client-side exports
export {
  initMixpanel,
  identifyUser,
  trackEvent,
  setUserProperties,
  trackPageView,
  resetUser,
  isInitialized,
} from "./client";

// Server-side exports
export {
  trackEvent as trackEventServer,
  setUserProperties as setUserPropertiesServer,
  setUserPropertiesOnce,
  incrementUserProperty,
  trackAccountCreated,
  trackCheckinCompleted,
  trackRewardClaimed,
  trackLocationCreated,
  trackPointsEarned,
  trackTierChanged,
} from "./server";

// Event constants
export { ANALYTICS_EVENTS } from "./events";

// Types
export type {
  AnalyticsEvent,
  UserProperties,
  CheckinEventProperties,
  RewardEventProperties,
  LocationCreatedProperties,
  PointsEarnedProperties,
  TierChangedProperties,
  AccountCreatedProperties,
} from "./types";


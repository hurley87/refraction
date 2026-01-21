import Mixpanel from 'mixpanel';
import type {
  UserProperties,
  CheckinEventProperties,
  RewardEventProperties,
  LocationCreatedProperties,
  PointsEarnedProperties,
  TierChangedProperties,
  AccountCreatedProperties,
} from './types';
import { ANALYTICS_EVENTS } from './events';

let mixpanelInstance: Mixpanel.Mixpanel | null = null;

/**
 * Initialize Mixpanel server-side instance
 */
export function initMixpanelServer(token: string, secret?: string): void {
  if (mixpanelInstance) return;

  mixpanelInstance = Mixpanel.init(token, {
    secret: secret,
  });
}

/**
 * Get or initialize Mixpanel instance
 */
function getMixpanel(): Mixpanel.Mixpanel {
  // Token should be the project token, not the secret
  const token =
    process.env.MIXPANEL_TOKEN || process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  const secret = process.env.MIXPANEL_SECRET;

  if (!token) {
    console.warn('Mixpanel token not found. Analytics events will be skipped.');
    // Return a mock instance that does nothing
    return {
      track: () => {},
      people: {
        set: () => {},
        set_once: () => {},
        increment: () => {},
      },
    } as any;
  }

  if (!mixpanelInstance) {
    initMixpanelServer(token, secret);
  }

  return mixpanelInstance!;
}

/**
 * Track an event server-side
 */
export function trackEvent(
  distinctId: string,
  eventName: string,
  properties?: Record<string, any>
): void {
  try {
    const mixpanel = getMixpanel();
    mixpanel.track(eventName, {
      distinct_id: distinctId,
      ...properties,
    });
  } catch (error) {
    console.error('Failed to track Mixpanel event:', error);
  }
}

/**
 * Set user properties server-side
 */
export function setUserProperties(
  distinctId: string,
  properties: UserProperties
): void {
  try {
    const mixpanel = getMixpanel();
    mixpanel.people.set(distinctId, properties);
  } catch (error) {
    console.error('Failed to set Mixpanel user properties:', error);
  }
}

/**
 * Set user properties once (for first-time properties like first_action_at)
 */
export function setUserPropertiesOnce(
  distinctId: string,
  properties: Partial<UserProperties>
): void {
  try {
    const mixpanel = getMixpanel();
    mixpanel.people.set_once(distinctId, properties);
  } catch (error) {
    console.error('Failed to set Mixpanel user properties once:', error);
  }
}

/**
 * Increment a user property
 */
export function incrementUserProperty(
  distinctId: string,
  property: string,
  value: number = 1
): void {
  try {
    const mixpanel = getMixpanel();
    mixpanel.people.increment(distinctId, property, value);
  } catch (error) {
    console.error('Failed to increment Mixpanel user property:', error);
  }
}

// Convenience functions for specific events

export function trackAccountCreated(
  distinctId: string,
  properties: AccountCreatedProperties
): void {
  trackEvent(distinctId, ANALYTICS_EVENTS.ACCOUNT_CREATED, properties);
  setUserPropertiesOnce(distinctId, {
    wallet_address: properties.wallet_address,
    wallet_type: properties.wallet_type,
    first_action_at: new Date().toISOString(),
  });
}

export function trackCheckinCompleted(
  distinctId: string,
  properties: CheckinEventProperties
): void {
  trackEvent(distinctId, ANALYTICS_EVENTS.CHECKIN_COMPLETED, properties);
  trackEvent(distinctId, ANALYTICS_EVENTS.USER_ACTIVE, {
    action_type: 'checkin',
  });
}

export function trackRewardClaimed(
  distinctId: string,
  properties: RewardEventProperties
): void {
  trackEvent(distinctId, ANALYTICS_EVENTS.REWARD_CLAIMED, properties);
  trackEvent(distinctId, ANALYTICS_EVENTS.USER_ACTIVE, {
    action_type: 'reward_claim',
  });
}

export function trackLocationCreated(
  distinctId: string,
  properties: LocationCreatedProperties
): void {
  trackEvent(distinctId, ANALYTICS_EVENTS.LOCATION_CREATED, properties);
  trackEvent(distinctId, ANALYTICS_EVENTS.USER_ACTIVE, {
    action_type: 'location_created',
  });
}

export function trackPointsEarned(
  distinctId: string,
  properties: PointsEarnedProperties
): void {
  trackEvent(distinctId, ANALYTICS_EVENTS.POINTS_EARNED, properties);
}

export function trackTierChanged(
  distinctId: string,
  properties: TierChangedProperties
): void {
  trackEvent(distinctId, ANALYTICS_EVENTS.TIER_CHANGED, properties);
  setUserProperties(distinctId, {
    tier: properties.new_tier,
  });
}

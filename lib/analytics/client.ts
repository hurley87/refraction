"use client";

import mixpanel from "mixpanel-browser";
import type { UserProperties } from "./types";

/**
 * Initialize Mixpanel client-side tracking
 * Should be called once when the app loads
 */
export function initMixpanel(token: string): void {
  if (typeof window === "undefined") return;

  mixpanel.init(token, {
    debug: process.env.NODE_ENV === "development",
    track_pageview: false, // We'll track pageviews manually
    persistence: "localStorage",
  });
}

/**
 * Identify a user with their wallet address and properties
 */
export function identifyUser(
  distinctId: string,
  properties?: UserProperties,
): void {
  if (typeof window === "undefined") return;

  mixpanel.identify(distinctId);

  if (properties) {
    mixpanel.people.set(properties);
  }
}

/**
 * Track an event with optional properties
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, any>,
): void {
  if (typeof window === "undefined") return;

  mixpanel.track(eventName, properties);
}

/**
 * Set user properties (updates user profile)
 */
export function setUserProperties(properties: UserProperties): void {
  if (typeof window === "undefined") return;

  mixpanel.people.set(properties);
}

/**
 * Track a page view
 */
export function trackPageView(pageName?: string, properties?: Record<string, any>): void {
  if (typeof window === "undefined") return;

  mixpanel.track("$pageview", {
    page: pageName || window.location.pathname,
    ...properties,
  });
}

/**
 * Reset user identity (on logout)
 */
export function resetUser(): void {
  if (typeof window === "undefined") return;

  mixpanel.reset();
}

/**
 * Check if Mixpanel is initialized
 */
export function isInitialized(): boolean {
  if (typeof window === "undefined") return false;
  // Check if mixpanel has been initialized by verifying it has the track method
  return typeof mixpanel.track === "function";
}


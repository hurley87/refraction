"use client";

import type { UserProperties } from "./types";

let _mixpanelInitialized = false;
let _mixpanelInstance: typeof import("mixpanel-browser").default | null = null;
let _initPromise: Promise<void> | null = null;

/**
 * Initialize Mixpanel client-side tracking
 * Should be called once when the app loads
 * Uses dynamic import to reduce initial bundle size
 */
export async function initMixpanel(token: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (_mixpanelInitialized) return;

  // If initialization is already in progress, return the existing promise
  if (_initPromise) {
    return _initPromise;
  }

  // Dynamically import mixpanel-browser to reduce initial bundle size
  // This only loads when analytics are actually enabled
  _initPromise = (async () => {
    if (!_mixpanelInstance) {
      const mixpanelModule = await import("mixpanel-browser");
      _mixpanelInstance = mixpanelModule.default;
    }

    _mixpanelInstance.init(token, {
      debug: process.env.NODE_ENV === "development",
      track_pageview: false, // We'll track pageviews manually via route changes for better control
      persistence: "localStorage", // Recommended by Mixpanel for web
      autocapture: false, // Disabled - we track events manually for better control and privacy
    });

    _mixpanelInitialized = true;
  })();

  return _initPromise;
}

/**
 * Get the Mixpanel instance (for internal use)
 */
function getMixpanel() {
  if (!_mixpanelInstance) {
    throw new Error("Mixpanel not initialized. Call initMixpanel() first.");
  }
  return _mixpanelInstance;
}

/**
 * Identify a user with their wallet address and properties
 */
export function identifyUser(
  distinctId: string,
  properties?: UserProperties,
): void {
  if (typeof window === "undefined") return;
  if (!_mixpanelInitialized) return;

  const mixpanel = getMixpanel();
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
  if (!_mixpanelInitialized) return;

  const mixpanel = getMixpanel();
  mixpanel.track(eventName, properties);
}

/**
 * Set user properties (updates user profile)
 */
export function setUserProperties(properties: UserProperties): void {
  if (typeof window === "undefined") return;
  if (!_mixpanelInitialized) return;

  const mixpanel = getMixpanel();
  mixpanel.people.set(properties);
}

/**
 * Track a page view
 * Uses mixpanel.track() with "$pageview" event name for compatibility
 */
export function trackPageView(
  pageName?: string,
  properties?: Record<string, any>,
): void {
  if (typeof window === "undefined") return;
  if (!_mixpanelInitialized) return;

  const mixpanel = getMixpanel();

  // Track pageview using the standard track() method with "$pageview" event
  // This is more reliable than track_pageview() which may not be available in all SDK versions
  const pageProperties = {
    page: pageName || window.location.pathname,
    pathname: window.location.pathname,
    search: window.location.search,
    ...properties,
  };

  mixpanel.track("$pageview", pageProperties);
}

/**
 * Reset user identity (on logout)
 */
export function resetUser(): void {
  if (typeof window === "undefined") return;
  if (!_mixpanelInitialized) return;

  const mixpanel = getMixpanel();
  mixpanel.reset();
}

/**
 * Opt out of tracking (for privacy compliance)
 * Call this when user opts out of analytics
 */
export function optOutTracking(): void {
  if (typeof window === "undefined") return;
  if (!_mixpanelInitialized) return;

  const mixpanel = getMixpanel();
  mixpanel.opt_out_tracking();
}

/**
 * Opt in to tracking (for privacy compliance)
 * Call this when user opts in to analytics after previously opting out
 */
export function optInTracking(): void {
  if (typeof window === "undefined") return;
  if (!_mixpanelInitialized) return;

  const mixpanel = getMixpanel();
  mixpanel.opt_in_tracking();
}

/**
 * Check if user has opted out of tracking
 */
export function hasOptedOutTracking(): boolean {
  if (typeof window === "undefined") return false;
  if (!_mixpanelInitialized) return false;

  const mixpanel = getMixpanel();
  return mixpanel.has_opted_out_tracking();
}

/**
 * Check if Mixpanel is initialized
 */
export function isInitialized(): boolean {
  if (typeof window === "undefined") return false;
  return _mixpanelInitialized;
}

/**
 * Wait for Mixpanel initialization to complete
 * Useful for ensuring initialization is done before tracking events
 */
export async function waitForInitialization(): Promise<void> {
  if (typeof window === "undefined") return;
  if (_mixpanelInitialized) return;
  if (_initPromise) {
    await _initPromise;
  }
}

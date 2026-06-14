'use client';

import {
  ATTRIBUTION_LIMITS,
  SIGNUP_ATTRIBUTION_STORAGE_KEY,
  type AttributionTouch,
  type SignupAttributionPayload,
  type SignupAttributionSession,
  extractCheckpointIdFromPath,
  extractOptionalQueryIds,
  parseUtmFromSearch,
  signupAttributionPayloadHasData,
  truncateField,
} from '@/lib/analytics/attribution-core';
import {
  registerSuperProperties,
  registerSuperPropertiesOnce,
} from '@/lib/analytics/client';
import { getClientOrigin } from '@/lib/client-origin';

function readSession(): SignupAttributionSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SIGNUP_ATTRIBUTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const p = parsed as Partial<SignupAttributionSession>;
    if (!p.firstTouch || !p.lastTouch) return null;
    return { firstTouch: p.firstTouch, lastTouch: p.lastTouch };
  } catch {
    return null;
  }
}

function writeSession(session: SignupAttributionSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      SIGNUP_ATTRIBUTION_STORAGE_KEY,
      JSON.stringify(session)
    );
  } catch {
    // ignore quota / private mode
  }
}

function touchFromNavigation(opts: {
  pathname: string;
  search: string;
  href: string;
  referrer: string;
}): AttributionTouch {
  const utm = parseUtmFromSearch(opts.search);
  const ids = extractOptionalQueryIds(opts.search);
  const checkpointId = extractCheckpointIdFromPath(opts.pathname);
  return {
    ...utm,
    referrer: truncateField(
      opts.referrer || undefined,
      ATTRIBUTION_LIMITS.referrer
    ),
    landing_page: truncateField(opts.href, ATTRIBUTION_LIMITS.landingPage),
    current_path: truncateField(opts.pathname, ATTRIBUTION_LIMITS.path),
    ...(checkpointId ? { checkpoint_id: checkpointId } : {}),
    ...ids,
  };
}

function hasAnyUtm(t: Partial<AttributionTouch>): boolean {
  return Boolean(
    t.utm_source ||
    t.utm_medium ||
    t.utm_campaign ||
    t.utm_term ||
    t.utm_content
  );
}

/**
 * Capture first-touch (once) and refresh last-touch attribution from the current URL.
 * Call on route changes (e.g. from AnalyticsProvider).
 */
export function captureSignupAttributionFromNavigation(opts: {
  pathname: string;
  search: string;
}): void {
  if (typeof window === 'undefined') return;

  const search =
    opts.search && !opts.search.startsWith('?')
      ? `?${opts.search}`
      : opts.search || '';

  const href = `${getClientOrigin()}${opts.pathname}${search}`;
  const referrer = document.referrer || '';

  const touch = touchFromNavigation({
    pathname: opts.pathname,
    search,
    href,
    referrer,
  });

  const existing = readSession();

  if (!existing) {
    writeSession({ firstTouch: touch, lastTouch: touch });
    return;
  }

  const newUtm = hasAnyUtm(touch);

  const mergedLast: AttributionTouch = {
    ...existing.lastTouch,
    landing_page: touch.landing_page,
    current_path: touch.current_path,
    referrer:
      touch.referrer?.trim() !== ''
        ? touch.referrer
        : existing.lastTouch.referrer,
    checkpoint_id: touch.checkpoint_id ?? existing.lastTouch.checkpoint_id,
    event_id: touch.event_id ?? existing.lastTouch.event_id,
    location_id: touch.location_id ?? existing.lastTouch.location_id,
  };

  if (newUtm) {
    mergedLast.utm_source = touch.utm_source;
    mergedLast.utm_medium = touch.utm_medium;
    mergedLast.utm_campaign = touch.utm_campaign;
    mergedLast.utm_term = touch.utm_term;
    mergedLast.utm_content = touch.utm_content;
  }

  writeSession({
    firstTouch: existing.firstTouch,
    lastTouch: mergedLast,
  });
}

function buildPayload(
  session: SignupAttributionSession
): SignupAttributionPayload {
  const { firstTouch, lastTouch } = session;
  return {
    initial_utm_source: firstTouch.utm_source,
    initial_utm_medium: firstTouch.utm_medium,
    initial_utm_campaign: firstTouch.utm_campaign,
    initial_utm_term: firstTouch.utm_term,
    initial_utm_content: firstTouch.utm_content,
    initial_referrer: firstTouch.referrer,
    initial_landing_page: firstTouch.landing_page,

    utm_source: lastTouch.utm_source,
    utm_medium: lastTouch.utm_medium,
    utm_campaign: lastTouch.utm_campaign,
    utm_term: lastTouch.utm_term,
    utm_content: lastTouch.utm_content,
    referrer: lastTouch.referrer,
    landing_page: lastTouch.landing_page,
    current_path: lastTouch.current_path,

    checkpoint_id: firstTouch.checkpoint_id,
    event_id: firstTouch.event_id,
    location_id: firstTouch.location_id,
  };
}

/** Merge into POST /api/player JSON body; omits key when nothing stored. */
export function getSignupAttributionBodyFields(): {
  signup_attribution?: SignupAttributionPayload;
} {
  const session = readSession();
  if (!session) return {};
  const payload = buildPayload(session);
  if (!signupAttributionPayloadHasData(payload)) return {};
  return { signup_attribution: payload };
}

/**
 * Register first-touch attribution as Mixpanel super properties (once) and refresh current-touch supers.
 */
export function syncSignupAttributionSuperProperties(): void {
  const session = readSession();
  if (!session) return;

  const payload = buildPayload(session);
  if (!signupAttributionPayloadHasData(payload)) return;

  registerSuperPropertiesOnce({
    initial_utm_source: payload.initial_utm_source,
    initial_utm_medium: payload.initial_utm_medium,
    initial_utm_campaign: payload.initial_utm_campaign,
    initial_utm_term: payload.initial_utm_term,
    initial_utm_content: payload.initial_utm_content,
    initial_referrer: payload.initial_referrer,
    initial_landing_page: payload.initial_landing_page,
    initial_checkpoint_id: payload.checkpoint_id,
    initial_event_id: payload.event_id,
    initial_location_id: payload.location_id,
  });

  registerSuperProperties({
    utm_source: payload.utm_source,
    utm_medium: payload.utm_medium,
    utm_campaign: payload.utm_campaign,
    utm_term: payload.utm_term,
    utm_content: payload.utm_content,
    referrer: payload.referrer,
    landing_page: payload.landing_page,
    current_path: payload.current_path,
  });
}

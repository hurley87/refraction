/**
 * First-touch signup attribution helpers (browser-agnostic).
 * Used by the client for capture/normalization and by the server for Mixpanel payloads.
 */

export const SIGNUP_ATTRIBUTION_STORAGE_KEY = 'irl_signup_attribution_v1';

/** Max lengths guardrails against oversized URL/query payloads */
export const ATTRIBUTION_LIMITS = {
  utm: 256,
  referrer: 2048,
  landingPage: 2048,
  path: 512,
  id: 128,
} as const;

export type AttributionTouch = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
  current_path?: string;
  checkpoint_id?: string;
  event_id?: string;
  location_id?: string;
};

export type SignupAttributionSession = {
  firstTouch: AttributionTouch;
  lastTouch: AttributionTouch;
};

export function truncateField(
  value: string | undefined,
  max: number
): string | undefined {
  if (value == null) return undefined;
  const t = value.trim();
  if (!t) return undefined;
  return t.length > max ? t.slice(0, max) : t;
}

export function parseUtmFromSearch(
  search: string
): Partial<
  Pick<
    AttributionTouch,
    'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_term' | 'utm_content'
  >
> {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  return {
    utm_source: truncateField(
      params.get('utm_source') ?? undefined,
      ATTRIBUTION_LIMITS.utm
    ),
    utm_medium: truncateField(
      params.get('utm_medium') ?? undefined,
      ATTRIBUTION_LIMITS.utm
    ),
    utm_campaign: truncateField(
      params.get('utm_campaign') ?? undefined,
      ATTRIBUTION_LIMITS.utm
    ),
    utm_term: truncateField(
      params.get('utm_term') ?? undefined,
      ATTRIBUTION_LIMITS.utm
    ),
    utm_content: truncateField(
      params.get('utm_content') ?? undefined,
      ATTRIBUTION_LIMITS.utm
    ),
  };
}

export function extractCheckpointIdFromPath(
  pathname: string
): string | undefined {
  const m = pathname.match(/^\/c\/([^/?#]+)/);
  return m ? truncateField(m[1], ATTRIBUTION_LIMITS.id) : undefined;
}

export function extractOptionalQueryIds(
  search: string
): Pick<AttributionTouch, 'event_id' | 'location_id'> {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const eventRaw =
    params.get('event_id') ??
    params.get('eventId') ??
    params.get('event') ??
    undefined;
  const locationRaw =
    params.get('location_id') ??
    params.get('locationId') ??
    params.get('location') ??
    undefined;
  return {
    event_id: truncateField(eventRaw ?? undefined, ATTRIBUTION_LIMITS.id),
    location_id: truncateField(locationRaw ?? undefined, ATTRIBUTION_LIMITS.id),
  };
}

function pathFromLandingUrl(landingUrl: string): string | undefined {
  try {
    const u = new URL(landingUrl, 'https://placeholder.local');
    return truncateField(u.pathname, ATTRIBUTION_LIMITS.path);
  } catch {
    return undefined;
  }
}

function checkpointFromLanding(
  landingUrl: string | undefined
): string | undefined {
  if (!landingUrl) return undefined;
  const p = pathFromLandingUrl(landingUrl);
  return p ? extractCheckpointIdFromPath(p) : undefined;
}

/**
 * Derive normalized signup_source / signup_channel / signup_context from first-touch data.
 * Priority: checkpoint landing → UTM source → Instagram referrer → generic referrer → direct.
 */
export function normalizeSignupAttribution(first: AttributionTouch): {
  signup_source: string;
  signup_channel: string;
  signup_context?: string;
} {
  const checkpointId =
    first.checkpoint_id ||
    extractCheckpointIdFromPath(first.current_path || '') ||
    checkpointFromLanding(first.landing_page);

  if (checkpointId) {
    return {
      signup_source: 'event',
      signup_channel: 'checkpoint',
      signup_context: 'physical_touchpoint',
    };
  }

  const utm = first.utm_source?.trim().toLowerCase();
  if (utm) {
    return {
      signup_source: utm,
      signup_channel: first.utm_medium?.trim().toLowerCase() || 'campaign',
    };
  }

  const ref = (first.referrer || '').toLowerCase();
  if (ref.includes('instagram.com')) {
    return { signup_source: 'instagram', signup_channel: 'social' };
  }

  if (first.referrer?.trim()) {
    return { signup_source: 'referral', signup_channel: 'web' };
  }

  return { signup_source: 'direct', signup_channel: 'direct' };
}

export type SignupAttributionPayload = {
  initial_utm_source?: string;
  initial_utm_medium?: string;
  initial_utm_campaign?: string;
  initial_utm_term?: string;
  initial_utm_content?: string;
  initial_referrer?: string;
  initial_landing_page?: string;

  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
  current_path?: string;

  checkpoint_id?: string;
  event_id?: string;
  location_id?: string;
};

export function signupAttributionPayloadHasData(
  payload: SignupAttributionPayload
): boolean {
  return Object.values(payload).some(
    (v) => v !== undefined && v !== null && String(v).trim() !== ''
  );
}

/** Build Mixpanel `account_created` attribution fields from a validated API payload. */
export function accountCreatedAttributionFromPayload(
  payload: SignupAttributionPayload
): Record<string, string | undefined> {
  const first: AttributionTouch = {
    utm_source: payload.initial_utm_source,
    utm_medium: payload.initial_utm_medium,
    utm_campaign: payload.initial_utm_campaign,
    utm_term: payload.initial_utm_term,
    utm_content: payload.initial_utm_content,
    referrer: payload.initial_referrer,
    landing_page: payload.initial_landing_page,
    checkpoint_id: payload.checkpoint_id,
    event_id: payload.event_id,
    location_id: payload.location_id,
  };

  const normalized = normalizeSignupAttribution(first);

  const out: Record<string, string | undefined> = {
    signup_source: normalized.signup_source,
    signup_channel: normalized.signup_channel,
    ...(normalized.signup_context != null
      ? { signup_context: normalized.signup_context }
      : {}),

    initial_utm_source: payload.initial_utm_source,
    initial_utm_medium: payload.initial_utm_medium,
    initial_utm_campaign: payload.initial_utm_campaign,
    initial_utm_term: payload.initial_utm_term,
    initial_utm_content: payload.initial_utm_content,
    initial_referrer: payload.initial_referrer,
    initial_landing_page: payload.initial_landing_page,

    utm_source: payload.utm_source,
    utm_medium: payload.utm_medium,
    utm_campaign: payload.utm_campaign,
    utm_term: payload.utm_term,
    utm_content: payload.utm_content,
    referrer: payload.referrer,
    landing_page: payload.landing_page,
    current_path: payload.current_path,

    checkpoint_id: payload.checkpoint_id,
    event_id: payload.event_id,
    location_id: payload.location_id,
  };

  return Object.fromEntries(
    Object.entries(out).filter(([, v]) => v !== undefined && v !== '')
  ) as Record<string, string | undefined>;
}

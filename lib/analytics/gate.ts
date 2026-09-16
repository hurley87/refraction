import type { GateSurface } from '@/lib/analytics/attribution-core';

export type { GateSurface };

export type GateEventProperties = {
  surface: GateSurface;
  guide_slug?: string;
};

/** Mixpanel props shared by `gate_viewed`, `gate_signup_clicked`, and `signup_from_gate`. */
export function gateEventProperties(
  surface: GateSurface,
  guideSlug?: string
): GateEventProperties {
  const slug = guideSlug?.trim();
  if (surface === 'city_guide' && slug) {
    return { surface, guide_slug: slug };
  }
  return { surface };
}

const GATE_VIEWED_SESSION_KEY = 'irl_gate_viewed_session_v1';

/**
 * Returns true the first time this surface's gate is viewed in the tab session.
 * Later modal reopens return false so `gate_viewed` stays once-per-session.
 */
export function consumeGateViewedOncePerSession(surface: GateSurface): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = `${GATE_VIEWED_SESSION_KEY}:${surface}`;
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, '1');
    return true;
  } catch {
    return true;
  }
}

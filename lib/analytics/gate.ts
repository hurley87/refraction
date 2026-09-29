import type { GateSurface } from '@/lib/analytics/attribution-core';

export type { GateSurface };

export type GateEventProperties = {
  surface: GateSurface;
  guide_slug?: string;
  reward_id?: string;
};

/**
 * Mixpanel props shared by `gate_viewed`, `gate_signup_clicked`, and
 * `signup_from_gate`. The second argument is the guide slug or reward id.
 */
export function gateEventProperties(
  surface: GateSurface,
  subjectId?: string
): GateEventProperties {
  const id = subjectId?.trim();
  if (surface === 'city_guide' && id) {
    return { surface, guide_slug: id };
  }
  if (surface === 'reward' && id) {
    return { surface, reward_id: id };
  }
  return { surface };
}

const GATE_VIEWED_SESSION_KEY = 'irl_gate_viewed_session_v1';

/**
 * Returns true the first time this gate is viewed in the tab session.
 * `scopeId` splits one surface by subject (a reward id), so reopening the same
 * reward does not count again and a different reward still does.
 */
export function consumeGateViewedOncePerSession(
  surface: GateSurface,
  scopeId?: string
): boolean {
  if (typeof window === 'undefined') return false;
  const scope = scopeId?.trim();
  const key = scope
    ? `${GATE_VIEWED_SESSION_KEY}:${surface}:${scope}`
    : `${GATE_VIEWED_SESSION_KEY}:${surface}`;
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, '1');
    return true;
  } catch {
    return true;
  }
}

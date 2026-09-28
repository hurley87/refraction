import { trackEvent } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';

/**
 * Ordered walkthrough steps. `step_order` is the funnel sequence:
 * the four welcome slides, then the five yellow pointers.
 */
export const MAP_TOUR_STEPS = {
  slide_1: { kind: 'slide', order: 1, label: 'Welcome' },
  slide_2: { kind: 'slide', order: 2, label: 'Local Guides' },
  slide_3: { kind: 'slide', order: 3, label: 'Rewards' },
  slide_4: { kind: 'slide', order: 4, label: 'Get Started' },
  pointer_1: { kind: 'pointer', order: 5, label: 'Search a spot you love' },
  pointer_2: { kind: 'pointer', order: 6, label: 'Start your first list' },
  pointer_3: { kind: 'pointer', order: 7, label: 'Group your favorite spots' },
  pointer_4: { kind: 'pointer', order: 8, label: 'Go to your profile' },
  pointer_5: { kind: 'pointer', order: 9, label: 'Profile tip' },
} as const;

export type MapTourStepId = keyof typeof MAP_TOUR_STEPS;

const SEEN_SESSION_KEY = 'irl_map_tour_steps_seen_v1';

/** First view of this step (and tip variant) in the tab. Later mounts are ignored. */
export function consumeMapTourStepOnce(dedupeKey: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = sessionStorage.getItem(SEEN_SESSION_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const seen = Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string')
      : [];
    if (seen.includes(dedupeKey)) return false;
    seen.push(dedupeKey);
    sessionStorage.setItem(SEEN_SESSION_KEY, JSON.stringify(seen));
    return true;
  } catch {
    return true;
  }
}

export function mapTourStepProperties(
  stepId: MapTourStepId,
  extra?: Record<string, string>
): Record<string, string | number> {
  const step = MAP_TOUR_STEPS[stepId];
  return {
    step: stepId,
    step_kind: step.kind,
    step_order: step.order,
    step_label: step.label,
    ...extra,
  };
}

/** Fire `map_tour_step_viewed` the first time this step is shown in the tab. */
export function trackMapTourStep(
  stepId: MapTourStepId,
  extra?: Record<string, string>
): void {
  const dedupeKey = extra?.tip ? `${stepId}:${extra.tip}` : stepId;
  if (!consumeMapTourStepOnce(dedupeKey)) return;
  trackEvent(
    ANALYTICS_EVENTS.MAP_TOUR_STEP_VIEWED,
    mapTourStepProperties(stepId, extra)
  );
}

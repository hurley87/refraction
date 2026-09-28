import { beforeEach, describe, expect, it } from 'vitest';
import {
  consumeMapTourStepOnce,
  MAP_TOUR_STEPS,
  mapTourStepProperties,
} from '@/lib/analytics/map-tour';

describe('MAP_TOUR_STEPS', () => {
  it('orders the four slides ahead of pointers 1 to 5', () => {
    const orders = Object.values(MAP_TOUR_STEPS).map((step) => step.order);
    expect(new Set(orders).size).toBe(orders.length);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(MAP_TOUR_STEPS.slide_4.order).toBeLessThan(
      MAP_TOUR_STEPS.pointer_1.order
    );
    expect(MAP_TOUR_STEPS.pointer_5.order).toBe(
      MAP_TOUR_STEPS.pointer_1.order + 4
    );
  });
});

describe('mapTourStepProperties', () => {
  it('names the step so a Mixpanel funnel can split on it', () => {
    expect(mapTourStepProperties('pointer_2')).toEqual({
      step: 'pointer_2',
      step_kind: 'pointer',
      step_order: 6,
      step_label: 'Start your first list',
    });
  });

  it('keeps a tip variant on the profile pointer', () => {
    expect(
      mapTourStepProperties('pointer_5', { tip: 'go_to_rewards' }).tip
    ).toBe('go_to_rewards');
  });
});

describe('consumeMapTourStepOnce', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('accepts each step once per tab, including tip variants', () => {
    expect(consumeMapTourStepOnce('slide_1')).toBe(true);
    expect(consumeMapTourStepOnce('slide_1')).toBe(false);
    expect(consumeMapTourStepOnce('pointer_5:complete_profile')).toBe(true);
    expect(consumeMapTourStepOnce('pointer_5:go_to_rewards')).toBe(true);
    expect(consumeMapTourStepOnce('pointer_5:go_to_rewards')).toBe(false);
  });
});

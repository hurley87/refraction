import { describe, it, expect, beforeEach } from 'vitest';
import {
  consumeGateViewedOncePerSession,
  gateEventProperties,
} from '@/lib/analytics/gate';

describe('gateEventProperties', () => {
  it('includes guide_slug only for city_guide', () => {
    expect(gateEventProperties('city_guide', 'berlin')).toEqual({
      surface: 'city_guide',
      guide_slug: 'berlin',
    });
    expect(gateEventProperties('map')).toEqual({ surface: 'map' });
    expect(gateEventProperties('reward', 'perk-floyd')).toEqual({
      surface: 'reward',
      reward_id: 'perk-floyd',
    });
    expect(gateEventProperties('reward')).toEqual({ surface: 'reward' });
  });
});

describe('consumeGateViewedOncePerSession', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('returns true once per surface per tab session', () => {
    expect(consumeGateViewedOncePerSession('map')).toBe(true);
    expect(consumeGateViewedOncePerSession('map')).toBe(false);
    expect(consumeGateViewedOncePerSession('city_guide')).toBe(true);
  });

  it('counts each reward once per tab, and a different reward again', () => {
    expect(consumeGateViewedOncePerSession('reward', 'perk-a')).toBe(true);
    expect(consumeGateViewedOncePerSession('reward', 'perk-a')).toBe(false);
    expect(consumeGateViewedOncePerSession('reward', 'perk-b')).toBe(true);
  });
});

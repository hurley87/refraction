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
});

import { describe, expect, it } from 'vitest';

import {
  CITY_GUIDE_LOCATION_GATE_ENABLED,
  shouldApplyCityGuideLocationGate,
} from '@/lib/guides/city-guide-location-gate';

describe('city guide location gate', () => {
  it('stays off for public and full audiences', () => {
    expect(CITY_GUIDE_LOCATION_GATE_ENABLED).toBe(false);
    expect(shouldApplyCityGuideLocationGate('public')).toBe(false);
    expect(shouldApplyCityGuideLocationGate(undefined)).toBe(false);
    expect(shouldApplyCityGuideLocationGate('full')).toBe(false);
  });
});

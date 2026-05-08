import { describe, it, expect } from 'vitest';
import { signupAttributionSchema } from '@/lib/schemas/signup-attribution';
import { ATTRIBUTION_LIMITS } from '@/lib/analytics/attribution-core';

describe('signupAttributionSchema', () => {
  it('accepts undefined signup attribution shape', () => {
    const r = signupAttributionSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it('trims and truncates oversized strings', () => {
    const long = 'x'.repeat(ATTRIBUTION_LIMITS.utm + 10);
    const r = signupAttributionSchema.safeParse({
      initial_utm_source: long,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.initial_utm_source?.length).toBe(ATTRIBUTION_LIMITS.utm);
    }
  });

  it('coerces null to undefined', () => {
    const r = signupAttributionSchema.safeParse({
      utm_source: null,
      referrer: null,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.utm_source).toBeUndefined();
      expect(r.data.referrer).toBeUndefined();
    }
  });
});

import { z } from 'zod';
import { ATTRIBUTION_LIMITS } from '@/lib/analytics/attribution-core';

function optionalTrimmed(maxLen: number) {
  return z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v): string | undefined => {
      if (v == null) return undefined;
      const t = String(v).trim();
      if (!t) return undefined;
      return t.length > maxLen ? t.slice(0, maxLen) : t;
    });
}

/**
 * Optional signup attribution from the client (first- and last-touch).
 * Validated on POST /api/player to bound payload size.
 */
export const signupAttributionSchema = z.object({
  initial_utm_source: optionalTrimmed(ATTRIBUTION_LIMITS.utm),
  initial_utm_medium: optionalTrimmed(ATTRIBUTION_LIMITS.utm),
  initial_utm_campaign: optionalTrimmed(ATTRIBUTION_LIMITS.utm),
  initial_utm_term: optionalTrimmed(ATTRIBUTION_LIMITS.utm),
  initial_utm_content: optionalTrimmed(ATTRIBUTION_LIMITS.utm),
  initial_referrer: optionalTrimmed(ATTRIBUTION_LIMITS.referrer),
  initial_landing_page: optionalTrimmed(ATTRIBUTION_LIMITS.landingPage),

  utm_source: optionalTrimmed(ATTRIBUTION_LIMITS.utm),
  utm_medium: optionalTrimmed(ATTRIBUTION_LIMITS.utm),
  utm_campaign: optionalTrimmed(ATTRIBUTION_LIMITS.utm),
  utm_term: optionalTrimmed(ATTRIBUTION_LIMITS.utm),
  utm_content: optionalTrimmed(ATTRIBUTION_LIMITS.utm),
  referrer: optionalTrimmed(ATTRIBUTION_LIMITS.referrer),
  landing_page: optionalTrimmed(ATTRIBUTION_LIMITS.landingPage),
  current_path: optionalTrimmed(ATTRIBUTION_LIMITS.path),

  checkpoint_id: optionalTrimmed(ATTRIBUTION_LIMITS.id),
  event_id: optionalTrimmed(ATTRIBUTION_LIMITS.id),
  location_id: optionalTrimmed(ATTRIBUTION_LIMITS.id),
});

export type SignupAttributionValidated = z.infer<
  typeof signupAttributionSchema
>;

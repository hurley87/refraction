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

export const irlCardWaitlistAttributionSchema = z.object({
  utm_source: optionalTrimmed(ATTRIBUTION_LIMITS.utm),
  utm_medium: optionalTrimmed(ATTRIBUTION_LIMITS.utm),
  utm_campaign: optionalTrimmed(ATTRIBUTION_LIMITS.utm),
  utm_term: optionalTrimmed(ATTRIBUTION_LIMITS.utm),
  utm_content: optionalTrimmed(ATTRIBUTION_LIMITS.utm),
  source: optionalTrimmed(ATTRIBUTION_LIMITS.id),
  source_ref: optionalTrimmed(ATTRIBUTION_LIMITS.id),
  landing_page: optionalTrimmed(ATTRIBUTION_LIMITS.landingPage),
  referrer: optionalTrimmed(ATTRIBUTION_LIMITS.referrer),
});

export const irlCardWaitlistRequestSchema = z.object({
  email: z.string().trim().min(1).max(254).email(),
  countryId: z.string().uuid(),
  city: z.object({
    mapboxId: z.string().trim().min(1).max(256),
    name: z.string().trim().min(1).max(200),
    region: optionalTrimmed(200),
  }),
  alreadyUsesIrl: z.boolean(),
  marketingConsent: z.boolean().optional().default(false),
  attribution: irlCardWaitlistAttributionSchema.optional(),
});

export type IrlCardWaitlistRequest = z.infer<
  typeof irlCardWaitlistRequestSchema
>;
export type IrlCardWaitlistAttribution = z.infer<
  typeof irlCardWaitlistAttributionSchema
>;

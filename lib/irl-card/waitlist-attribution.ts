import {
  ATTRIBUTION_LIMITS,
  parseUtmFromSearch,
  truncateField,
  type SignupAttributionPayload,
} from '@/lib/analytics/attribution-core';

export type IrlCardWaitlistAttributionPayload = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  source?: string;
  source_ref?: string;
  landing_page?: string;
  referrer?: string;
};

/**
 * Campaign attribution for a waitlist signup. UTMs and `source` / `source_ref`
 * (venue QR codes) on the current URL win; otherwise the stored first touch is
 * used so a visitor who browsed before joining keeps their original campaign.
 */
export function buildIrlCardWaitlistAttribution(input: {
  search: string;
  href: string;
  referrer: string;
  stored?: SignupAttributionPayload;
}): IrlCardWaitlistAttributionPayload {
  const params = new URLSearchParams(input.search);
  const current = parseUtmFromSearch(input.search);
  const stored = input.stored ?? {};
  const hasCurrentUtm = Object.values(current).some(Boolean);

  const utm = hasCurrentUtm
    ? current
    : {
        utm_source: stored.initial_utm_source,
        utm_medium: stored.initial_utm_medium,
        utm_campaign: stored.initial_utm_campaign,
        utm_term: stored.initial_utm_term,
        utm_content: stored.initial_utm_content,
      };

  const payload: IrlCardWaitlistAttributionPayload = {
    ...utm,
    source: truncateField(
      params.get('source') ?? undefined,
      ATTRIBUTION_LIMITS.id
    ),
    source_ref: truncateField(
      params.get('source_ref') ?? undefined,
      ATTRIBUTION_LIMITS.id
    ),
    landing_page: truncateField(
      stored.initial_landing_page ?? input.href,
      ATTRIBUTION_LIMITS.landingPage
    ),
    referrer: truncateField(
      stored.initial_referrer ?? (input.referrer || undefined),
      ATTRIBUTION_LIMITS.referrer
    ),
  };

  return Object.fromEntries(
    Object.entries(payload).filter(([, v]) => typeof v === 'string' && v)
  ) as IrlCardWaitlistAttributionPayload;
}

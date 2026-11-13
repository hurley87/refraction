export const IRL_CARD_WAITLIST_PATH = '/irl-card/waitlist';

/** Share link: page URL with share UTMs only, no referral code. */
export function buildIrlCardWaitlistShareUrl(origin: string): string {
  const url = new URL(IRL_CARD_WAITLIST_PATH, origin);
  url.searchParams.set('utm_source', 'waitlist-share');
  url.searchParams.set('utm_medium', 'share');
  return url.toString();
}

export function buildIrlExploreUrl(origin: string): string {
  const url = new URL('/interactive-map', origin);
  url.searchParams.set('utm_source', 'irl-card-waitlist');
  url.searchParams.set('utm_medium', 'email');
  return url.toString();
}

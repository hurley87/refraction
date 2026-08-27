import { normalizeUsername } from '@/lib/username';

const PUBLIC_LIST_SHARE_ORIGIN = 'https://www.irl.energy';

function publicListPath(username: string, listSlug: string): string {
  const normalizedUsername = normalizeUsername(username);
  const normalizedSlug = listSlug.trim().toLowerCase();
  return `/map/${encodeURIComponent(normalizedUsername)}/${encodeURIComponent(normalizedSlug)}`;
}

/** Canonical share URL: irl.energy/map/{username}/{list-slug} */
export function buildPublicListShareUrl(input: {
  username: string;
  listSlug: string;
  /** Overrides the canonical origin (e.g. the current browser origin). */
  origin?: string;
}): string {
  const origin =
    input.origin?.trim().replace(/\/+$/, '') || PUBLIC_LIST_SHARE_ORIGIN;
  return `${origin}${publicListPath(input.username, input.listSlug)}`;
}

/**
 * Same-origin path for the generated share card, so in-app previews render the
 * exact image that unfurls on social.
 */
export function buildPublicListShareCardPath(input: {
  username: string;
  listSlug: string;
}): string {
  return `${publicListPath(input.username, input.listSlug)}/opengraph-image`;
}

/**
 * Body for a shared message. The card credits itself, so the text carries only
 * the link: an attached image cannot be tapped.
 */
export function buildPublicListShareMessage(input: {
  listTitle: string;
  shareUrl: string;
}): string {
  return `Check out ${input.listTitle.trim()} on IRL: ${input.shareUrl}`;
}

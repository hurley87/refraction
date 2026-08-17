const MEMBER_SHARE_ORIGIN = 'https://www.irl.energy';

/** Same rules as `slugify` in lib/db/cities.ts (kept local to avoid a DB import). */
function slugifyPerkTitle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}

/**
 * UTM-tagged /rewards URL for member-driven perk shares.
 * Includes `perkId` so /rewards can open that perk's detail drawer.
 * `utm_campaign` is a slug of the perk title, or the perk id if the title slugs empty.
 */
export function buildPerkMemberShareUrl(input: {
  title: string;
  perkId?: string;
}): string {
  const perkId = input.perkId?.trim();
  const fromTitle = slugifyPerkTitle(input.title);
  const campaign = fromTitle || perkId || 'perk';
  const url = new URL('/rewards', MEMBER_SHARE_ORIGIN);
  if (perkId) {
    url.searchParams.set('perkId', perkId);
  }
  url.searchParams.set('utm_source', 'member-share');
  url.searchParams.set('utm_medium', 'share');
  url.searchParams.set('utm_campaign', campaign);
  return url.toString();
}

import { normalizeUsername } from '@/lib/username';

const PUBLIC_LIST_SHARE_ORIGIN = 'https://www.irl.energy';

/** Canonical share URL: irl.energy/map/{username}/{list-slug} */
export function buildPublicListShareUrl(input: {
  username: string;
  listSlug: string;
}): string {
  const username = normalizeUsername(input.username);
  const listSlug = input.listSlug.trim().toLowerCase();
  return `${PUBLIC_LIST_SHARE_ORIGIN}/map/${encodeURIComponent(username)}/${encodeURIComponent(listSlug)}`;
}

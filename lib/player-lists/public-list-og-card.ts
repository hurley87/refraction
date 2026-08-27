import type { PublicCustomListWithLocations } from '@/lib/db/player-custom-lists';
import { resolvePublicListShareLookup } from '@/lib/db/player-custom-lists';
import { isReservedUsername, normalizeUsername } from '@/lib/username';

export type PublicListOgCard = {
  title: string;
  ownerLabel: string;
  spotsLabel: string;
  photoUrl: string | null;
};

export function publicListOgOwnerLabel(
  owner: PublicCustomListWithLocations['owner']
): string {
  const username = owner.username?.trim();
  if (username) return `@${username.replace(/^@/, '')}`;
  const name = owner.name?.trim();
  if (name) return name;
  return 'IRL member';
}

export function publicListOgSpotsLabel(count: number): string {
  return count === 1 ? '1 spot' : `${count} spots`;
}

/**
 * Cover image for the list OG card: list thumbnail, else first spot photo.
 */
export function publicListOgPhotoUrl(
  list: PublicCustomListWithLocations
): string | null {
  const thumbnail = list.thumbnail_url?.trim();
  if (thumbnail) return thumbnail;

  const first = list.locations[0];
  const fromSpot =
    first?.coin_image_thumb_url?.trim() || first?.coin_image_url?.trim();
  return fromSpot || null;
}

export function buildPublicListOgCard(
  list: PublicCustomListWithLocations
): PublicListOgCard {
  return {
    title: list.title.trim() || 'Untitled list',
    ownerLabel: publicListOgOwnerLabel(list.owner),
    spotsLabel: publicListOgSpotsLabel(list.locations.length),
    photoUrl: publicListOgPhotoUrl(list),
  };
}

/**
 * Resolve the public list used for share-page metadata and OG images.
 * Follows retired slugs to the current list.
 */
export async function resolvePublicListForSharePage(
  username: string,
  listSlug: string
): Promise<PublicCustomListWithLocations | null> {
  const normalizedUsername = normalizeUsername(username);
  const normalizedSlug = listSlug.trim().toLowerCase();
  if (
    !normalizedUsername ||
    isReservedUsername(normalizedUsername) ||
    !normalizedSlug
  ) {
    return null;
  }

  const resolved = await resolvePublicListShareLookup(
    normalizedUsername,
    normalizedSlug
  );
  if (!resolved) return null;
  if (resolved.kind === 'list') return resolved.list;

  const canonical = await resolvePublicListShareLookup(
    resolved.username,
    resolved.listSlug
  );
  return canonical?.kind === 'list' ? canonical.list : null;
}

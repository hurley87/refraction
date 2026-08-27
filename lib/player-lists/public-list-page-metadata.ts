import type { PublicCustomListWithLocations } from '@/lib/db/player-custom-lists';
import { buildPublicListShareUrl } from '@/lib/player-lists/public-list-share-url';

function ownerUsernameForDisplay(
  owner: PublicCustomListWithLocations['owner']
): string {
  const username = owner.username?.trim();
  if (username) return `@${username.replace(/^@/, '')}`;
  const name = owner.name?.trim();
  if (name) return name;
  return 'IRL member';
}

/** Page title: "{list_name} by {username} on IRL" */
export function publicListPageTitle(
  list: PublicCustomListWithLocations
): string {
  return `${list.title} by ${ownerUsernameForDisplay(list.owner)} on IRL`;
}

/** Meta description with list blurb, or name, place count, and first three spots. */
export function publicListPageDescription(
  list: PublicCustomListWithLocations
): string {
  const customDescription = list.description?.trim();
  if (customDescription) return customDescription;

  const count = list.locations.length;
  const spotWord = count === 1 ? 'spot' : 'spots';
  const previewNames = list.locations
    .slice(0, 3)
    .map((location) => location.name.trim())
    .filter(Boolean);

  if (previewNames.length === 0) {
    return `${list.title} — ${count} ${spotWord} on IRL.`;
  }

  let joined = previewNames[0];
  if (previewNames.length === 2) {
    joined = `${previewNames[0]} and ${previewNames[1]}`;
  } else if (previewNames.length >= 3) {
    joined = `${previewNames[0]}, ${previewNames[1]}, and ${previewNames[2]}`;
  }

  return `${list.title} — ${count} ${spotWord} including ${joined}.`;
}

/** Schema.org ItemList JSON-LD for a public list share page. */
export function publicListItemListJsonLd(
  list: PublicCustomListWithLocations
): Record<string, unknown> {
  const username = list.owner.username?.trim();
  if (!username || !list.slug) {
    throw new Error('Public list JSON-LD requires owner username and slug');
  }

  const pageUrl = buildPublicListShareUrl({
    username,
    listSlug: list.slug,
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: list.title,
    ...(list.description?.trim()
      ? { description: list.description.trim() }
      : {}),
    numberOfItems: list.locations.length,
    url: pageUrl,
    itemListElement: list.locations.map((location, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: location.name,
      item: {
        '@type': 'Place',
        name: location.name,
        ...(location.address?.trim()
          ? { address: location.address.trim() }
          : {}),
        geo: {
          '@type': 'GeoCoordinates',
          latitude: location.latitude,
          longitude: location.longitude,
        },
      },
    })),
  };
}

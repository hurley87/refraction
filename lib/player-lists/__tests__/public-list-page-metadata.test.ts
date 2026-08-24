import { describe, expect, it } from 'vitest';
import type { PublicCustomListWithLocations } from '@/lib/db/player-custom-lists';
import {
  publicListItemListJsonLd,
  publicListPageDescription,
  publicListPageTitle,
} from '@/lib/player-lists/public-list-page-metadata';

function sampleList(
  overrides: Partial<PublicCustomListWithLocations> = {}
): PublicCustomListWithLocations {
  return {
    id: 'list-1',
    player_id: 1,
    title: 'Berlin spots',
    slug: 'berlin-spots',
    is_private: false,
    created_at: '2026-01-01T00:00:00.000Z',
    location_count: 3,
    locations: [
      {
        id: 1,
        name: 'Bambis',
        place_id: 'bambis',
        latitude: 1,
        longitude: 2,
      },
      {
        id: 2,
        name: 'Greta',
        place_id: 'greta',
        latitude: 3,
        longitude: 4,
      },
      {
        id: 3,
        name: 'OHLA',
        place_id: 'ohla',
        latitude: 5,
        longitude: 6,
      },
    ],
    owner: {
      wallet_address: '0xabc',
      username: 'alice',
      name: 'Alice',
      profile_picture_url: null,
      twitter_handle: null,
    },
    ...overrides,
  } as PublicCustomListWithLocations;
}

describe('publicListPageTitle', () => {
  it('uses list name and @username', () => {
    expect(publicListPageTitle(sampleList())).toBe(
      'Berlin spots by @alice on IRL'
    );
  });
});

describe('publicListPageDescription', () => {
  it('includes place count and first three spot names', () => {
    expect(publicListPageDescription(sampleList())).toBe(
      'Berlin spots — 3 spots including Bambis, Greta, and OHLA.'
    );
  });

  it('handles a single spot', () => {
    const list = sampleList({
      locations: [
        {
          id: 1,
          name: 'Bambis',
          place_id: 'bambis',
          latitude: 1,
          longitude: 2,
        },
      ],
      location_count: 1,
    });
    expect(publicListPageDescription(list)).toBe(
      'Berlin spots — 1 spot including Bambis.'
    );
  });
});

describe('publicListItemListJsonLd', () => {
  it('emits Schema.org ItemList with list items', () => {
    const jsonLd = publicListItemListJsonLd(sampleList());
    expect(jsonLd['@type']).toBe('ItemList');
    expect(jsonLd.numberOfItems).toBe(3);
    expect(jsonLd.itemListElement).toHaveLength(3);
    expect(jsonLd.url).toBe('https://www.irl.energy/map/alice/berlin-spots');
  });
});

import { describe, expect, it } from 'vitest';
import type { PublicCustomListWithLocations } from '@/lib/db/player-custom-lists';
import type { Location } from '@/lib/types';
import {
  buildPublicListOgCard,
  publicListOgOwnerLabel,
  publicListOgPhotoUrl,
  publicListOgSpotsLabel,
} from '@/lib/player-lists/public-list-og-card';

function sampleLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: 1,
    name: 'Bambis',
    place_id: 'bambis',
    latitude: 1,
    longitude: 2,
    points_value: 10,
    ...overrides,
  };
}

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
    locations: [sampleLocation()],
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

describe('publicListOgOwnerLabel', () => {
  it('prefixes @ on username', () => {
    expect(publicListOgOwnerLabel(sampleList().owner)).toBe('@alice');
  });

  it('falls back to display name, then IRL member', () => {
    expect(
      publicListOgOwnerLabel({
        wallet_address: '0xabc',
        username: null,
        name: 'Alice',
        profile_picture_url: null,
        twitter_handle: null,
      })
    ).toBe('Alice');
    expect(
      publicListOgOwnerLabel({
        wallet_address: '0xabc',
        username: null,
        name: null,
        profile_picture_url: null,
        twitter_handle: null,
      })
    ).toBe('IRL member');
  });
});

describe('publicListOgSpotsLabel', () => {
  it('singularizes one spot', () => {
    expect(publicListOgSpotsLabel(1)).toBe('1 spot');
    expect(publicListOgSpotsLabel(0)).toBe('0 spots');
    expect(publicListOgSpotsLabel(8)).toBe('8 spots');
  });
});

describe('publicListOgPhotoUrl', () => {
  it('prefers the list thumbnail', () => {
    expect(
      publicListOgPhotoUrl(
        sampleList({
          thumbnail_url: 'https://cdn.example/list.jpg',
          locations: [
            sampleLocation({ coin_image_url: 'https://cdn.example/spot.jpg' }),
          ],
        })
      )
    ).toBe('https://cdn.example/list.jpg');
  });

  it('falls back to the first spot thumb then full image', () => {
    expect(
      publicListOgPhotoUrl(
        sampleList({
          locations: [
            sampleLocation({
              coin_image_thumb_url: 'https://cdn.example/thumb.jpg',
              coin_image_url: 'https://cdn.example/spot.jpg',
            }),
          ],
        })
      )
    ).toBe('https://cdn.example/thumb.jpg');
    expect(
      publicListOgPhotoUrl(
        sampleList({
          locations: [
            sampleLocation({ coin_image_url: 'https://cdn.example/spot.jpg' }),
          ],
        })
      )
    ).toBe('https://cdn.example/spot.jpg');
  });

  it('returns null when there is no image', () => {
    expect(publicListOgPhotoUrl(sampleList())).toBeNull();
  });
});

describe('buildPublicListOgCard', () => {
  it('assembles title, owner, spots, and photo', () => {
    expect(
      buildPublicListOgCard(
        sampleList({
          thumbnail_url: 'https://cdn.example/list.jpg',
          locations: [
            sampleLocation(),
            sampleLocation({ id: 2, name: 'Greta', place_id: 'greta' }),
          ],
        })
      )
    ).toEqual({
      title: 'Berlin spots',
      ownerLabel: '@alice',
      spotsLabel: '2 spots',
      photoUrl: 'https://cdn.example/list.jpg',
    });
  });
});

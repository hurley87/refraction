import { describe, it, expect, vi } from 'vitest';
import {
  editorialBlocksSchema,
  parseEditorialBlocks,
} from '@/lib/guides/block-schema';
import {
  hubListTitle,
  guideKindToUi,
  toGuideContributorUi,
} from '@/lib/db/guides';
import type { GuideContributorRow, GuideRow } from '@/lib/db/guides';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFrom = vi.fn((): any => ({}));

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: () => mockFrom(),
  },
}));

describe('guides helpers', () => {
  it('hubListTitle builds city guide title', () => {
    const row = {
      kind: 'city_guide',
      title_prefix: 'The IRL Guide to',
      city_name: 'Berlin',
      title_primary: null,
      title_secondary: null,
      slug: 'x',
    } as GuideRow;
    expect(hubListTitle(row)).toBe('The IRL Guide to Berlin');
  });

  it('hubListTitle falls back to slug for empty city guide fields', () => {
    const row = {
      kind: 'city_guide',
      title_prefix: null,
      city_name: null,
      title_primary: null,
      title_secondary: null,
      slug: 'only-slug',
    } as GuideRow;
    expect(hubListTitle(row)).toBe('only-slug');
  });

  it('hubListTitle uses editorial primary only', () => {
    const row = {
      kind: 'editorial',
      title_prefix: null,
      city_name: null,
      title_primary: 'Hello',
      title_secondary: 'World',
      slug: 'x',
    } as GuideRow;
    expect(hubListTitle(row)).toBe('Hello');
  });

  it('guideKindToUi maps DB kind', () => {
    expect(guideKindToUi('city_guide')).toBe('city-guide');
    expect(guideKindToUi('editorial')).toBe('editorial');
  });

  it('uses live linked-player profile data for a contributor', () => {
    const contributor = {
      guide_id: 'guide-1',
      position: 0,
      player_id: 42,
      name: 'Saved Name',
      bio: 'Saved bio',
      photo_url: '/saved.jpg',
      photo_alt: 'Saved alt',
      instagram_href: '@saved',
      location_list_id: null,
      player: {
        name: 'Current Name',
        username: 'current_user',
        wallet_address: '0xcurrent',
        bio: 'Current bio',
        profile_picture_url: '/current.jpg',
        instagram_handle: '@current',
        twitter_handle: '@current',
      },
    } satisfies GuideContributorRow;

    expect(toGuideContributorUi(contributor)).toEqual({
      name: 'Current Name',
      bio: 'Current bio',
      photoSrc: '/current.jpg',
      photoAlt: 'Portrait of Current Name',
      instagramHref: 'https://www.instagram.com/current/',
      profileHref: '/current_user',
    });
  });

  it('falls back to saved contributor fields when linked profile fields are empty', () => {
    const contributor = {
      guide_id: 'guide-1',
      position: 0,
      player_id: 42,
      name: 'Saved Name',
      bio: 'Saved bio',
      photo_url: '/saved.jpg',
      photo_alt: 'Saved alt',
      instagram_href: '@saved',
      location_list_id: null,
      player: {
        name: null,
        username: null,
        wallet_address: null,
        bio: null,
        profile_picture_url: null,
        instagram_handle: null,
        twitter_handle: null,
      },
    } satisfies GuideContributorRow;

    expect(toGuideContributorUi(contributor)).toEqual({
      name: 'Saved Name',
      bio: 'Saved bio',
      photoSrc: '/saved.jpg',
      photoAlt: 'Saved alt',
      instagramHref: 'https://www.instagram.com/saved/',
      profileHref: '',
    });
  });

  it('links a player without a username through their wallet profile route', () => {
    const contributor = {
      guide_id: 'guide-1',
      position: 0,
      player_id: 42,
      name: 'Saved Name',
      bio: null,
      photo_url: null,
      photo_alt: null,
      instagram_href: null,
      location_list_id: null,
      player: {
        name: 'Wallet User',
        username: null,
        wallet_address: '0x1234',
        bio: null,
        profile_picture_url: null,
        instagram_handle: null,
        twitter_handle: null,
      },
    } satisfies GuideContributorRow;

    expect(toGuideContributorUi(contributor).profileHref).toBe(
      '/profiles/0x1234'
    );
  });

  it('falls back to the linked player Twitter avatar when they have no uploaded photo', () => {
    const contributor = {
      guide_id: 'guide-1',
      position: 0,
      player_id: 42,
      name: 'Saved Name',
      bio: null,
      photo_url: '/saved.jpg',
      photo_alt: null,
      instagram_href: null,
      location_list_id: null,
      player: {
        name: 'Greg',
        username: 'lovegreg',
        wallet_address: '0x1234',
        bio: null,
        profile_picture_url: null,
        instagram_handle: null,
        twitter_handle: '@lovegreg',
      },
    } satisfies GuideContributorRow;

    expect(toGuideContributorUi(contributor).photoSrc).toBe(
      'https://unavatar.io/twitter/lovegreg'
    );
    expect(toGuideContributorUi(contributor).name).toBe('Greg');
  });
});

describe('editorialBlocksSchema', () => {
  it('accepts a valid block stream', () => {
    const raw = [
      { type: 'paragraph', text: 'a' },
      { type: 'typography', style: 'title3', text: 'b' },
      {
        type: 'image',
        src: '/x.jpg',
        alt: 'x',
        caption: 'c',
      },
    ];
    const parsed = editorialBlocksSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
  });

  it('rejects unknown block type', () => {
    const parsed = editorialBlocksSchema.safeParse([
      { type: 'video', src: 'x' },
    ]);
    expect(parsed.success).toBe(false);
  });
});

describe('parseEditorialBlocks', () => {
  it('returns empty array for invalid JSON', () => {
    expect(parseEditorialBlocks(null)).toEqual([]);
    expect(parseEditorialBlocks('nope')).toEqual([]);
  });

  it('trims paragraph text', () => {
    const out = parseEditorialBlocks([{ type: 'paragraph', text: '  hi  ' }]);
    expect(out).toEqual([{ type: 'paragraph', text: 'hi' }]);
  });

  it('migrates legacy subtitleDisplay to typography h1', () => {
    const out = parseEditorialBlocks([
      { type: 'subtitleDisplay', text: '  Legacy  ' },
    ]);
    expect(out).toEqual([{ type: 'typography', style: 'h1', text: 'Legacy' }]);
  });

  it('migrates legacy subtitleTitle3 to typography title3', () => {
    const out = parseEditorialBlocks([
      { type: 'subtitleTitle3', text: '  Sub  ' },
    ]);
    expect(out).toEqual([{ type: 'typography', style: 'title3', text: 'Sub' }]);
  });
});

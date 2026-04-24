import { describe, it, expect, vi } from 'vitest';
import {
  editorialBlocksSchema,
  parseEditorialBlocks,
} from '@/lib/guides/block-schema';
import { hubListTitle, guideKindToUi } from '@/lib/db/guides';
import type { GuideRow } from '@/lib/db/guides';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFrom = vi.fn((): any => ({}));

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
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

  it('hubListTitle joins editorial primary and secondary', () => {
    const row = {
      kind: 'editorial',
      title_prefix: null,
      city_name: null,
      title_primary: 'Hello',
      title_secondary: 'World',
      slug: 'x',
    } as GuideRow;
    expect(hubListTitle(row)).toBe('Hello : World');
  });

  it('guideKindToUi maps DB kind', () => {
    expect(guideKindToUi('city_guide')).toBe('city-guide');
    expect(guideKindToUi('editorial')).toBe('editorial');
  });
});

describe('editorialBlocksSchema', () => {
  it('accepts a valid block stream', () => {
    const raw = [
      { type: 'paragraph', text: 'a' },
      { type: 'subtitleTitle3', text: 'b' },
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

  it('migrates legacy subtitleDisplay to subtitleH1', () => {
    const out = parseEditorialBlocks([
      { type: 'subtitleDisplay', text: '  Legacy  ' },
    ]);
    expect(out).toEqual([{ type: 'subtitleH1', text: 'Legacy' }]);
  });
});

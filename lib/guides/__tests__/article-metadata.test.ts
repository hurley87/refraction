import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GuideRow } from '@/lib/db/guides';

vi.mock('next/headers', () => ({
  headers: () =>
    new Headers({
      host: 'irl.energy',
      'x-forwarded-proto': 'https',
    }),
}));

import { buildGuideArticleMetadata } from '@/lib/guides/article-metadata';

const baseRow = {
  id: '1',
  slug: 'berlin',
  kind: 'city_guide',
  title_prefix: 'The IRL Guide to',
  city_name: 'Berlin',
  title_primary: null,
  title_secondary: null,
  title_highlight_words: [],
  hero_image_url: 'https://cdn.example.com/hero.jpg',
  hero_image_alt: 'Berlin hero',
  lead_headline: 'Lead headline',
  lead_paragraphs: [],
  location_list_id: null,
  map_image_url: null,
  map_image_alt: null,
  blocks: null,
  is_published: true,
  published_at: null,
  is_featured: false,
  card_preview: 'Card preview text',
  card_image_url: '',
  card_image_alt: '',
  featured_people: [],
  created_at: '',
  updated_at: '',
} satisfies GuideRow;

describe('buildGuideArticleMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets Open Graph and Twitter fields from the article', () => {
    const metadata = buildGuideArticleMetadata(baseRow);

    expect(metadata.title).toBe('The IRL Guide to Berlin | IRL');
    expect(metadata.description).toBe('Card preview text');
    expect(metadata.openGraph?.title).toBe('The IRL Guide to Berlin | IRL');
    expect(metadata.openGraph?.description).toBe('Card preview text');
    expect(metadata.openGraph?.url).toBe(
      'https://irl.energy/city-guides/berlin'
    );
    expect(metadata.openGraph?.images).toEqual([
      {
        url: 'https://cdn.example.com/hero.jpg',
        alt: 'Berlin hero',
      },
    ]);
    expect(metadata.twitter?.card).toBe('summary_large_image');
    expect(metadata.twitter?.images).toEqual([
      'https://cdn.example.com/hero.jpg',
    ]);
  });

  it('uses editorial path and falls back to lead headline for description', () => {
    const metadata = buildGuideArticleMetadata({
      ...baseRow,
      kind: 'editorial',
      slug: 'summer',
      title_prefix: null,
      city_name: null,
      title_primary: 'Summer Edit',
      card_preview: '',
      lead_headline: 'A seasonal roundup',
    });

    expect(metadata.openGraph?.url).toBe(
      'https://irl.energy/city-guides/editorial/summer'
    );
    expect(metadata.description).toBe('A seasonal roundup');
    expect(metadata.title).toBe('Summer Edit | IRL');
  });
});

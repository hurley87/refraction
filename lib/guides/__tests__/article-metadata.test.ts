import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GuideRow } from '@/lib/db/guides';

vi.mock('next/headers', () => ({
  headers: () =>
    new Headers({
      host: 'www.irl.energy',
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
      'https://www.irl.energy/city-guides/berlin'
    );
    expect(metadata.openGraph?.images).toEqual([
      {
        url: 'https://cdn.example.com/hero.jpg',
        type: 'image/jpeg',
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
      'https://www.irl.energy/city-guides/editorial/summer'
    );
    expect(metadata.description).toBe('A seasonal roundup');
    expect(metadata.title).toBe('Summer Edit | IRL');
  });

  it('falls back to the branded PNG for non-Supabase WebP heroes (Slack-safe)', () => {
    const metadata = buildGuideArticleMetadata({
      ...baseRow,
      hero_image_url: 'https://cdn.example.com/hero.webp',
      card_image_url: '',
    });

    expect(metadata.openGraph?.images).toEqual([
      {
        url: 'https://www.irl.energy/link-preview/og-default.png',
        type: 'image/png',
        width: 1200,
        height: 628,
        alt: 'Berlin hero',
      },
    ]);
  });

  it('routes Supabase WebP heroes through the JPEG transform endpoint', () => {
    const metadata = buildGuideArticleMetadata({
      ...baseRow,
      hero_image_url:
        'https://pwuhplqevqeonostnkgj.supabase.co/storage/v1/object/public/images/uploads/hero.webp',
      card_image_url: '',
    });

    const image = metadata.openGraph?.images?.[0] as
      | { url: string; type?: string }
      | undefined;
    expect(image?.url).toContain('/storage/v1/render/image/public/');
    expect(image?.url).toContain('width=1200');
    expect(image?.type).toBe('image/jpeg');
  });
});

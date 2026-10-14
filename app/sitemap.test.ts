import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetPublishedGuides = vi.fn();

vi.mock('@/lib/db/guides', () => ({
  getPublishedGuides: () => mockGetPublishedGuides(),
}));

import sitemap from './sitemap';

describe('sitemap', () => {
  beforeEach(() => {
    mockGetPublishedGuides.mockReset();
    mockGetPublishedGuides.mockResolvedValue([
      {
        slug: 'berlin',
        kind: 'city_guide',
        publishedAt: '2026-02-01T00:00:00.000Z',
      },
      {
        slug: 'listening-bars',
        kind: 'editorial',
        publishedAt: '2026-03-01T00:00:00.000Z',
      },
      {
        slug: 'template',
        kind: 'city_guide',
        publishedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        slug: 'editorial-123',
        kind: 'editorial',
        publishedAt: '2026-01-02T00:00:00.000Z',
      },
    ]);
  });

  it('lists public pages and published guides on the www origin', async () => {
    const urls = (await sitemap()).map((item) => item.url);

    expect(urls).toContain('https://www.irl.energy/');
    expect(urls).toContain('https://www.irl.energy/city-guides');
    expect(urls).toContain('https://www.irl.energy/venue-network');
    expect(urls).toContain('https://www.irl.energy/city-guides/berlin');
    expect(urls).toContain(
      'https://www.irl.energy/city-guides/editorial/listening-bars'
    );
    expect(urls).not.toContain('https://www.irl.energy/city-guides/template');
    expect(urls).not.toContain(
      'https://www.irl.energy/city-guides/editorial/editorial-123'
    );
    expect(urls.some((url) => url.includes('/c/'))).toBe(false);
    expect(urls.some((url) => url.includes('preview='))).toBe(false);
    expect(urls.some((url) => url.includes('/admin'))).toBe(false);
  });

  it('still returns the static pages when published guides fail to load', async () => {
    mockGetPublishedGuides.mockRejectedValue(new Error('down'));

    const urls = (await sitemap()).map((item) => item.url);

    expect(urls).toContain('https://www.irl.energy/membership');
    expect(urls).not.toContain('https://www.irl.energy/city-guides/berlin');
  });
});

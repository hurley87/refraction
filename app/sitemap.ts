import type { MetadataRoute } from 'next';

import { getPublishedGuides } from '@/lib/db/guides';
import { guideReadHref } from '@/lib/guides/guide-paths';
import { PRODUCTION_METADATA_ORIGIN } from '@/lib/metadata/request-base';

/** Indexable marketing and content routes. */
const STATIC_PATHS = [
  '/',
  '/membership',
  '/partners',
  '/faq',
  '/contact-us',
  '/events',
  '/city-guides',
  '/rewards',
  '/leaderboard',
  '/challenges',
  '/challenges/quests',
  '/venue-network',
  '/interactive-map',
  '/livepaper',
  '/stripecommons',
  '/stripecommons/artwork',
  '/stellar',
] as const;

/** Placeholder slugs that are published but should not be crawled. */
const JUNK_GUIDE_SLUGS = new Set(['template']);

function absoluteUrl(path: string): string {
  return new URL(path, PRODUCTION_METADATA_ORIGIN).href;
}

function entry(
  path: string,
  lastModified?: string | null
): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(path),
    ...(lastModified ? { lastModified: new Date(lastModified) } : {}),
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : 0.7,
  };
}

/**
 * Published guides only. Drafts never come back from `getPublishedGuides`.
 * Preview links are the same path plus `?preview=`, so they are not listed.
 * Checkpoint pages (`/c/…`) and placeholder slugs stay out.
 */
export function isIndexableGuideSlug(slug: string): boolean {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return false;
  if (JUNK_GUIDE_SLUGS.has(normalized)) return false;
  if (/^editorial-\d+$/.test(normalized)) return false;
  return true;
}

async function publishedGuideEntries(): Promise<MetadataRoute.Sitemap> {
  const guides = await getPublishedGuides();

  return guides.flatMap((guide) => {
    if (!isIndexableGuideSlug(guide.slug)) return [];
    const path = guideReadHref(guide.slug, guide.kind);
    if (path.startsWith('/c/') || path.includes('?')) return [];
    return [entry(path, guide.publishedAt)];
  });
}

/** Public sitemap referenced by `app/robots.ts`. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const guides = await publishedGuideEntries().catch(() => []);
  return [...STATIC_PATHS.map((path) => entry(path)), ...guides];
}

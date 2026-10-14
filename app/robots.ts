import type { MetadataRoute } from 'next';

import { PRODUCTION_METADATA_ORIGIN } from '@/lib/metadata/request-base';

/**
 * Give crawlers access to public content while keeping private and
 * transactional application areas out of search results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/api',
        '/dashboard',
        '/onboarding',
        '/spend',
        '/walletconnect',
      ],
    },
    sitemap: `${PRODUCTION_METADATA_ORIGIN}/sitemap.xml`,
  };
}

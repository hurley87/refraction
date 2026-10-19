import { PRODUCTION_METADATA_ORIGIN } from '@/lib/metadata/request-base';

import {
  SITE_DESCRIPTION,
  SITE_LOGO_PATH,
  SITE_NAME,
  SITE_SAME_AS,
} from './site-identity';

const SITE_ORGANIZATION_ID = `${PRODUCTION_METADATA_ORIGIN}/#organization`;
const SITE_WEBSITE_ID = `${PRODUCTION_METADATA_ORIGIN}/#website`;

/**
 * One JSON-LD document for the site: the organization and its website.
 * Absolute URLs only, so the Rich Results Test can fetch the logo.
 */
export function siteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': SITE_ORGANIZATION_ID,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: PRODUCTION_METADATA_ORIGIN,
        logo: new URL(SITE_LOGO_PATH, PRODUCTION_METADATA_ORIGIN).href,
        sameAs: [...SITE_SAME_AS],
      },
      {
        '@type': 'WebSite',
        '@id': SITE_WEBSITE_ID,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: PRODUCTION_METADATA_ORIGIN,
        publisher: { '@id': SITE_ORGANIZATION_ID },
      },
    ],
  };
}

/** Serialize for a script tag without letting a `<` close the element. */
export function siteJsonLdScript(): string {
  return JSON.stringify(siteJsonLd()).replace(/</g, '\\u003c');
}

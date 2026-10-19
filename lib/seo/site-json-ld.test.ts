import { describe, expect, it } from 'vitest';

import { PRODUCTION_METADATA_ORIGIN } from '@/lib/metadata/request-base';

import {
  IRL_INSTAGRAM_URL,
  IRL_X_URL,
  REFRACTION_FESTIVAL_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
} from './site-identity';
import { siteJsonLd, siteJsonLdScript } from './site-json-ld';

describe('siteJsonLd', () => {
  it('describes IRL once as an organization and its website', () => {
    expect(siteJsonLd()).toEqual({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${PRODUCTION_METADATA_ORIGIN}/#organization`,
          name: SITE_NAME,
          description: SITE_DESCRIPTION,
          url: PRODUCTION_METADATA_ORIGIN,
          logo: `${PRODUCTION_METADATA_ORIGIN}/icon.svg`,
          sameAs: [IRL_INSTAGRAM_URL, IRL_X_URL, REFRACTION_FESTIVAL_URL],
        },
        {
          '@type': 'WebSite',
          '@id': `${PRODUCTION_METADATA_ORIGIN}/#website`,
          name: SITE_NAME,
          description: SITE_DESCRIPTION,
          url: PRODUCTION_METADATA_ORIGIN,
          publisher: { '@id': `${PRODUCTION_METADATA_ORIGIN}/#organization` },
        },
      ],
    });
  });

  it('serializes a single script body with absolute urls', () => {
    const script = siteJsonLdScript();
    const parsed = JSON.parse(script) as {
      '@graph': Array<Record<string, string>>;
    };

    expect(script.startsWith('{')).toBe(true);
    expect(script.includes('<')).toBe(false);
    for (const node of parsed['@graph']) {
      expect(node.url.startsWith('https://www.irl.energy')).toBe(true);
    }
  });
});

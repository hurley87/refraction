import { describe, expect, it } from 'vitest';

import {
  PAYWALLED_CONTENT_SELECTOR,
  paywalledContentJsonLd,
} from './paywalled-content';

describe('paywalledContentJsonLd', () => {
  it('marks an article and its selected block as registration-gated', () => {
    expect(
      paywalledContentJsonLd({
        type: 'Article',
        url: 'https://www.irl.energy/city-guides/berlin',
        name: 'Berlin guide',
      })
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Berlin guide',
      url: 'https://www.irl.energy/city-guides/berlin',
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': 'https://www.irl.energy/city-guides/berlin',
      },
      isAccessibleForFree: false,
      hasPart: {
        '@type': 'WebPageElement',
        isAccessibleForFree: false,
        cssSelector: PAYWALLED_CONTENT_SELECTOR,
      },
    });
  });

  it('marks a map page and its selected viewport as gated', () => {
    const jsonLd = paywalledContentJsonLd({
      type: 'WebPage',
      url: 'https://www.irl.energy/interactive-map',
      name: 'IRL map',
    });

    expect(jsonLd).toMatchObject({
      '@type': 'WebPage',
      name: 'IRL map',
      isAccessibleForFree: false,
      hasPart: {
        isAccessibleForFree: false,
        cssSelector: '.irl-member-gated-content',
      },
    });
  });
});

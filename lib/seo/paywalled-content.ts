export const PAYWALLED_CONTENT_CLASS = 'irl-member-gated-content';
export const PAYWALLED_CONTENT_SELECTOR = `.${PAYWALLED_CONTENT_CLASS}`;

type PaywalledContentType = 'Article' | 'WebPage';

type PaywalledContentJsonLdOptions = {
  type: PaywalledContentType;
  url: string;
  name?: string;
};

/**
 * Registration walls use Google's paywalled-content markup just like paid
 * subscriptions. The selector must match the gated block rendered on the page.
 */
export function paywalledContentJsonLd({
  type,
  url,
  name,
}: PaywalledContentJsonLdOptions): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': type,
    ...(name ? (type === 'Article' ? { headline: name } : { name }) : {}),
    url,
    ...(type === 'Article'
      ? { mainEntityOfPage: { '@type': 'WebPage', '@id': url } }
      : {}),
    isAccessibleForFree: false,
    hasPart: {
      '@type': 'WebPageElement',
      isAccessibleForFree: false,
      cssSelector: PAYWALLED_CONTENT_SELECTOR,
    },
  };
}

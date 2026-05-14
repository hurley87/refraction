import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { hubListTitle, type GuideRow } from '@/lib/db/guides';
import {
  getMetadataBaseForRequest,
  toAbsoluteMetadataImageUrl,
} from '@/lib/metadata/request-base';

function guideArticlePath(row: Pick<GuideRow, 'kind' | 'slug'>): string {
  return row.kind === 'editorial'
    ? `/city-guides/editorial/${row.slug}`
    : `/city-guides/${row.slug}`;
}

function guideShareImage(row: GuideRow): string | undefined {
  const hero = row.hero_image_url?.trim();
  const card = row.card_image_url?.trim();
  return hero || card || undefined;
}

function guideShareDescription(row: GuideRow): string {
  return (
    row.card_preview?.trim() ||
    row.lead_headline?.trim() ||
    (row.kind === 'editorial' ? 'IRL editorial' : 'IRL city guide')
  );
}

/** Open Graph + Twitter metadata for a published city guide or editorial article. */
export function buildGuideArticleMetadata(
  row: GuideRow,
  options?: { noIndex?: boolean }
): Metadata {
  const h = headers();
  const { metadataBase } = getMetadataBaseForRequest(h);
  const title = `${hubListTitle(row)} | IRL`;
  const description = guideShareDescription(row);
  const pageUrl = new URL(guideArticlePath(row), metadataBase).href;
  const imageSrc = guideShareImage(row);
  const imageAlt =
    row.hero_image_alt?.trim() ||
    row.card_image_alt?.trim() ||
    hubListTitle(row);

  const openGraphImages = imageSrc
    ? [
        {
          url: toAbsoluteMetadataImageUrl(imageSrc, metadataBase),
          alt: imageAlt,
        },
      ]
    : undefined;

  const metadata: Metadata = {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'article',
      siteName: 'IRL',
      images: openGraphImages,
    },
    twitter: {
      card: openGraphImages ? 'summary_large_image' : 'summary',
      title,
      description,
      images: openGraphImages?.map((image) => image.url),
    },
  };

  if (options?.noIndex) {
    metadata.robots = { index: false, follow: false };
  }

  return metadata;
}

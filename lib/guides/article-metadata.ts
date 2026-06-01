import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { hubListTitle, type GuideRow } from '@/lib/db/guides';
import {
  getMetadataBaseForRequest,
  PRODUCTION_METADATA_ORIGIN,
  toSocialPreviewImageUrl,
} from '@/lib/metadata/request-base';

function guideArticlePath(row: Pick<GuideRow, 'kind' | 'slug'>): string {
  return row.kind === 'editorial'
    ? `/city-guides/editorial/${row.slug}`
    : `/city-guides/${row.slug}`;
}

function guideShareImage(row: GuideRow): string | undefined {
  return row.hero_image_url?.trim() || row.card_image_url?.trim() || undefined;
}

function guideShareDescription(row: GuideRow): string {
  return (
    row.card_preview?.trim() ||
    row.lead_headline?.trim() ||
    (row.kind === 'editorial' ? 'IRL editorial' : 'IRL city guide')
  );
}

function metadataBaseForGuideArticle(noIndex: boolean): URL {
  if (noIndex) {
    return getMetadataBaseForRequest(headers()).metadataBase;
  }

  return new URL(PRODUCTION_METADATA_ORIGIN);
}

/** Open Graph + Twitter metadata for a published city guide or editorial article. */
export function buildGuideArticleMetadata(
  row: GuideRow,
  options?: { noIndex?: boolean }
): Metadata {
  const noIndex = Boolean(options?.noIndex);
  const metadataBase = metadataBaseForGuideArticle(noIndex);
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
          ...toSocialPreviewImageUrl(imageSrc, metadataBase),
          alt: imageAlt,
        },
      ]
    : undefined;

  const metadata: Metadata = {
    metadataBase,
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

  if (noIndex) {
    metadata.robots = { index: false, follow: false };
  }

  return metadata;
}

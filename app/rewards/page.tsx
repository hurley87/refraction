import type { Metadata } from 'next';
import { headers } from 'next/headers';
import RewardsPageClient from './rewards-page-client';
import { getMetadataBaseForRequest } from '@/lib/metadata/request-base';
import {
  perkShareDescription,
  perkShareImagePath,
  perkSharePath,
  perkShareTitle,
} from '@/lib/perks/perk-share-card';
import { loadShareablePerk } from '@/lib/perks/shareable-perk';

type RewardsPageProps = {
  searchParams?: { perkId?: string | string[] };
};

function firstSearchParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? '';
  return value?.trim() ?? '';
}

/**
 * Member shares link to /rewards?perkId=… (see lib/perks/member-share-url.ts),
 * so the unfurled preview is built from that query param. Without it the route
 * keeps the site-wide card from the root layout.
 */
export async function generateMetadata({
  searchParams,
}: RewardsPageProps): Promise<Metadata> {
  const perkId = firstSearchParam(searchParams?.perkId);
  if (!perkId) return {};

  const perk = await loadShareablePerk(perkId);
  if (!perk) return {};

  const { metadataBase } = getMetadataBaseForRequest(headers());
  const canonical = new URL(perkSharePath(perkId), metadataBase).href;
  const imageUrl = new URL(perkShareImagePath(perkId), metadataBase).href;
  const title = perkShareTitle(perk);
  const description = perkShareDescription(perk);

  // The root layout defines `openGraph`, so these must be set explicitly or the
  // unfurled preview inherits the site-wide title and description.
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function RewardsPage() {
  return <RewardsPageClient />;
}

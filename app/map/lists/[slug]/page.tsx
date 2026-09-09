import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import InteractiveMap from '@/components/map/interactive-map';
import AuthWrapper from '@/components/auth/auth-wrapper';
import {
  getLocationListBySlug,
  getLocationsForList,
} from '@/lib/db/location-lists';
import {
  buildCuratedListMapHref,
  normalizeCuratedListSlug,
} from '@/lib/location-lists/curated-list-url';
import { getMetadataBaseForRequest } from '@/lib/metadata/request-base';
import { parseLatLng } from '@/lib/utils/map-bounds';
import { sanitizeInternalReturnPath } from '@/lib/utils/safe-return-path';
import type { LocationList } from '@/lib/types';

interface CuratedListMapPageProps {
  params: {
    slug: string;
  };
  searchParams: {
    returnTo?: string;
    lat?: string;
    lng?: string;
  };
}

const NOT_FOUND_METADATA: Metadata = {
  title: 'List not found · IRL',
  robots: { index: false, follow: false },
};

function listPageTitle(list: LocationList): string {
  return `${list.title} · IRL`;
}

function listPageDescription(list: LocationList): string {
  const custom = list.description?.trim();
  if (custom) return custom;
  return `${list.title} on IRL.`;
}

export async function generateMetadata({
  params,
}: CuratedListMapPageProps): Promise<Metadata> {
  const slug = normalizeCuratedListSlug(params.slug);
  if (!slug) return NOT_FOUND_METADATA;

  const list = await getLocationListBySlug(slug);
  if (!list) return NOT_FOUND_METADATA;

  const { metadataBase } = getMetadataBaseForRequest(headers());
  const canonical = new URL(buildCuratedListMapHref(list.slug), metadataBase)
    .href;
  const title = listPageTitle(list);
  const description = listPageDescription(list);

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function CuratedListMapPage({
  params,
  searchParams,
}: CuratedListMapPageProps) {
  const slug = normalizeCuratedListSlug(params.slug);
  if (!slug) notFound();

  const list = await getLocationListBySlug(slug);
  if (!list) notFound();

  const locations = await getLocationsForList(list.id);
  const firstCoords = locations
    .map((row) => parseLatLng(row.location.latitude, row.location.longitude))
    .find((coords) => coords !== null);
  const parsedCoords = parseLatLng(searchParams.lat, searchParams.lng);

  return (
    <AuthWrapper requireUsername unauthenticatedUI="map-onboarding">
      <div className="font-grotesk h-full w-full">
        <InteractiveMap
          initialCuratedListId={list.id}
          guideReturnHref={sanitizeInternalReturnPath(searchParams.returnTo)}
          initialLatitude={parsedCoords?.latitude ?? firstCoords?.latitude}
          initialLongitude={parsedCoords?.longitude ?? firstCoords?.longitude}
        />
      </div>
    </AuthWrapper>
  );
}

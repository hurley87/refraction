import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import InteractiveMap from '@/components/map/interactive-map';
import AuthWrapper from '@/components/auth/auth-wrapper';
import {
  resolvePublicListShareLookup,
  type PublicCustomListWithLocations,
} from '@/lib/db/player-custom-lists';
import {
  publicListItemListJsonLd,
  publicListPageDescription,
  publicListPageTitle,
} from '@/lib/player-lists/public-list-page-metadata';
import { buildPublicListShareUrl } from '@/lib/player-lists/public-list-share-url';
import {
  isReservedUsername,
  normalizeUsername,
  profilePathForPlayer,
} from '@/lib/username';
import { sanitizeInternalReturnPath } from '@/lib/utils/safe-return-path';

interface SharedPublicListPageProps {
  params: {
    username: string;
    listSlug: string;
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

async function resolvePublicListForPage(
  username: string,
  listSlug: string
): Promise<PublicCustomListWithLocations | null> {
  const resolved = await resolvePublicListShareLookup(username, listSlug);
  if (!resolved) return null;
  if (resolved.kind === 'list') return resolved.list;

  const canonical = await resolvePublicListShareLookup(
    resolved.username,
    resolved.listSlug
  );
  return canonical?.kind === 'list' ? canonical.list : null;
}

function buildSharedListMetadata(
  list: PublicCustomListWithLocations
): Metadata {
  const username = list.owner.username?.trim();
  const canonical =
    username && list.slug
      ? buildPublicListShareUrl({ username, listSlug: list.slug })
      : undefined;

  return {
    title: publicListPageTitle(list),
    description: publicListPageDescription(list),
    ...(canonical ? { alternates: { canonical } } : {}),
    robots: { index: true, follow: true },
  };
}

export async function generateMetadata({
  params,
}: SharedPublicListPageProps): Promise<Metadata> {
  const username = normalizeUsername(params.username);
  const listSlug = params.listSlug.trim().toLowerCase();

  if (!username || isReservedUsername(username) || !listSlug) {
    return NOT_FOUND_METADATA;
  }

  const list = await resolvePublicListForPage(username, listSlug);
  if (!list) return NOT_FOUND_METADATA;

  return buildSharedListMetadata(list);
}

function sharedListSearchParams(
  searchParams: SharedPublicListPageProps['searchParams']
): string {
  const query = new URLSearchParams();
  if (searchParams.returnTo) query.set('returnTo', searchParams.returnTo);
  if (searchParams.lat) query.set('lat', searchParams.lat);
  if (searchParams.lng) query.set('lng', searchParams.lng);
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export default async function SharedPublicListPage({
  params,
  searchParams,
}: SharedPublicListPageProps) {
  const username = normalizeUsername(params.username);
  const listSlug = params.listSlug.trim().toLowerCase();

  if (!username || isReservedUsername(username) || !listSlug) {
    notFound();
  }

  const resolved = await resolvePublicListShareLookup(username, listSlug);
  if (!resolved) {
    notFound();
  }

  if (resolved.kind === 'redirect') {
    permanentRedirect(
      `/map/${encodeURIComponent(resolved.username)}/${encodeURIComponent(resolved.listSlug)}${sharedListSearchParams(searchParams)}`
    );
  }

  const list = resolved.list;
  const returnPath = profilePathForPlayer({
    username: list.owner.username,
    wallet_address: list.owner.wallet_address,
  });
  const guideReturnHref =
    sanitizeInternalReturnPath(searchParams.returnTo) ?? returnPath;

  const latParam = searchParams.lat;
  const lngParam = searchParams.lng;
  let initialLatitude = list.locations[0]?.latitude;
  let initialLongitude = list.locations[0]?.longitude;
  if (latParam != null && lngParam != null) {
    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      initialLatitude = lat;
      initialLongitude = lng;
    }
  }

  const jsonLd = publicListItemListJsonLd(list);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AuthWrapper requireUsername unauthenticatedUI="map-onboarding">
        <div className="font-grotesk h-full w-full">
          <InteractiveMap
            initialPublicProfileListId={list.id}
            guideReturnHref={guideReturnHref}
            initialLatitude={initialLatitude}
            initialLongitude={initialLongitude}
          />
        </div>
      </AuthWrapper>
    </>
  );
}

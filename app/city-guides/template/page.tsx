import type { Metadata } from 'next';
import Link from 'next/link';

import { CityGuideArticleNav } from '@/components/city-guides/city-guide-article-nav';
import { CityGuideArticleDescription } from '@/components/city-guides/city-guide-article-description';
import { CityGuideArticleHeroImage } from '@/components/city-guides/city-guide-article-hero-image';
import { CityGuideLocationCard } from '@/components/city-guides/city-guide-location-card';
import { CityGuideTexturedImage } from '@/components/city-guides/city-guide-textured-image';
import { CityGuideArticleMetaRow } from '@/components/city-guides/city-guide-article-meta-row';
import { CityGuideArticleTitle } from '@/components/city-guides/city-guide-article-title';
import { getMichailStanglBerlinGuideListLocations } from '@/lib/db/location-lists';

export const metadata: Metadata = {
  title: 'City guide template | IRL',
  description:
    'Layout template for a city guide article — populate from CMS when ready.',
};

/** Lead copy after hero: Title4 bold headline + one or more Body Medium paragraphs. */
const TEMPLATE_LEAD_HEADLINE =
  'For over 15 years, Michail Stangl aka Opium Hum has been a vital node in the global electronic music underground.';
const TEMPLATE_LEAD_PARAGRAPHS = [
  'Best known as the former face and lead programmer of Boiler Room and as curator of Berlin’s legendary CTM Festival, Stangl’s work has consistently mapped the bleeding edges of contemporary club culture.',
];

/** Template hero; replace with CMS fields. */
const TEMPLATE_HERO = {
  guideKind: 'city-guide' as const,
  titlePrefix: 'The IRL Guide to',
  cityName: 'Berlin',
  contributors: ['Michail Stangl'] as const,
  heroImageSrc: '/city-guides/berlin/michail/michail-stangl-hero.jpg',
  heroImageAlt: 'Berlin — hero photograph for the city guide',
};

/** Static map for “In this guide”; replace with CMS / interactive map when ready. */
const TEMPLATE_GUIDE_MAP = {
  heading: 'In This Guide',
  imageSrc: '/city-guides/berlin/michail/michail-map.png',
  imageAlt: 'Map of locations featured in this guide',
} as const;

/** Path of this guide page — used for map “back” and `returnTo`. Replace with CMS slug path when needed. */
const CITY_GUIDE_TEMPLATE_PATH = '/city-guides/template';

function interactiveMapHrefForLocation(
  placeId: string,
  lat: number,
  lng: number
) {
  const q = new URLSearchParams();
  q.set('placeId', placeId);
  q.set('lat', String(lat));
  q.set('lng', String(lng));
  /** Opens bottom MapCard only; full check-in modal stays closed until user taps Check in. */
  q.set('mapCard', '1');
  q.set('returnTo', CITY_GUIDE_TEMPLATE_PATH);
  return `/interactive-map?${q.toString()}`;
}

function interactiveMapLaunchHref() {
  const q = new URLSearchParams();
  q.set('returnTo', CITY_GUIDE_TEMPLATE_PATH);
  return `/interactive-map?${q.toString()}`;
}

/**
 * Optional per-location contributor when CMS attributes a pick to one of several guide authors.
 * Replace with a CMS lookup; while null/empty, cards use the guide authors only (not `creator_username`).
 */
function getCmsContributorForLocation(placeId: string): string | null {
  if (!placeId.trim()) return null;
  return null;
}

function contributorLineForGuideLocation(
  placeId: string,
  guideContributors: readonly string[]
): string {
  const fromCms = getCmsContributorForLocation(placeId)?.trim();
  if (fromCms) return fromCms;
  if (guideContributors.length === 0) return '';
  if (guideContributors.length === 1) return guideContributors[0];
  return guideContributors.join(', ');
}

export default async function CityGuideTemplatePage() {
  const guideListLocations = await getMichailStanglBerlinGuideListLocations();

  return (
    <div className="min-h-screen w-full bg-[#F5F5F5] font-grotesk">
      <div className="mx-auto w-full max-w-[393px] rounded-[48px] bg-[var(--Backgrounds-Background,#FFF)] shadow-sm">
        <header className="sticky top-0 z-30 rounded-t-[48px] bg-[var(--Backgrounds-Background,#FFF)] pt-[max(8px,env(safe-area-inset-top))]">
          <CityGuideArticleNav />
        </header>

        <article className="px-4 pb-16 pt-2">
          <CityGuideArticleTitle
            titlePrefix={TEMPLATE_HERO.titlePrefix}
            cityName={TEMPLATE_HERO.cityName}
            contributors={[...TEMPLATE_HERO.contributors]}
            className="mb-4"
          />

          <CityGuideArticleMetaRow
            guideKind={TEMPLATE_HERO.guideKind}
            contributors={[...TEMPLATE_HERO.contributors]}
            className="mb-8"
          />

          <CityGuideArticleHeroImage
            src={TEMPLATE_HERO.heroImageSrc}
            alt={TEMPLATE_HERO.heroImageAlt}
            className="mb-[20px]"
          />

          <CityGuideArticleDescription
            headline={TEMPLATE_LEAD_HEADLINE}
            paragraphs={TEMPLATE_LEAD_PARAGRAPHS}
            className="mb-10"
          />

          <section
            className="-mx-4 box-border flex h-[439px] w-[calc(100%+2rem)] max-w-[393px] shrink-0 flex-col px-4 pb-3 pt-3 opacity-100"
            aria-label={TEMPLATE_GUIDE_MAP.heading}
          >
            <h2 className="title3 flex h-[54px] w-full max-w-[361px] shrink-0 items-center text-[#171717]">
              {TEMPLATE_GUIDE_MAP.heading}
            </h2>
            <div className="h-[361px] w-full max-w-[361px] shrink-0 overflow-hidden">
              <CityGuideTexturedImage
                src={TEMPLATE_GUIDE_MAP.imageSrc}
                alt={TEMPLATE_GUIDE_MAP.imageAlt}
                sizes="361px"
                containerClassName="h-full w-full"
                textureSrc={null}
              />
            </div>
          </section>

          {guideListLocations.length === 0 ? (
            <p className="body-medium mt-6 text-[#757575]">
              No locations found for Michail Stangl&rsquo;s list. Add venues in
              Admin → Location Lists, or set{' '}
              <code className="rounded bg-neutral-100 px-1 font-mono text-[13px]">
                MICHAIL_STANGL_BERLIN_LIST_SLUG
              </code>{' '}
              to your list&rsquo;s slug.
            </p>
          ) : (
            guideListLocations.map((entry, index) => {
              const loc = entry.location;
              const description =
                loc.description?.trim() || loc.address?.trim() || '—';
              const isLast = index === guideListLocations.length - 1;
              return (
                <CityGuideLocationCard
                  key={entry.membership_id}
                  name={loc.name}
                  description={description}
                  imageSrc={loc.coin_image_url ?? null}
                  imageAlt={`${loc.name} — location photo`}
                  contributorName={contributorLineForGuideLocation(
                    loc.place_id,
                    TEMPLATE_HERO.contributors
                  )}
                  mapHref={interactiveMapHrefForLocation(
                    loc.place_id,
                    loc.latitude,
                    loc.longitude
                  )}
                  isLast={isLast}
                />
              );
            })
          )}

          <div className="box-border flex h-[92px] w-full max-w-[361px] flex-col gap-2  py-6 opacity-100">
            <Link
              href={interactiveMapLaunchHref()}
              className="label-large flex h-11 w-full max-w-[361px] shrink-0 items-center justify-between bg-[#171717] px-4 py-2 text-white transition-opacity hover:opacity-90"
              aria-label="Launch the IRL map"
            >
              <span className="text-left">LAUNCH THE IRL MAP</span>
              <svg
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="size-6 shrink-0"
                aria-hidden
              >
                <path
                  d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                  fill="currentColor"
                />
              </svg>
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CityGuideArticleNav } from '@/components/city-guides/city-guide-article-nav';
import { CityGuideArticleDescription } from '@/components/city-guides/city-guide-article-description';
import { CityGuideArticleHeroImage } from '@/components/city-guides/city-guide-article-hero-image';
import { CityGuideLocationCard } from '@/components/city-guides/city-guide-location-card';
import { CityGuideTexturedImage } from '@/components/city-guides/city-guide-textured-image';
import { CityGuideArticleMetaRow } from '@/components/city-guides/city-guide-article-meta-row';
import { CityGuideArticleTitle } from '@/components/city-guides/city-guide-article-title';
import { GuideArticleContributorsSection } from '@/components/city-guides/guide-article-contributors-section';
import { getCityGuidePageData, hubListTitle } from '@/lib/db/guides';
import { DraftPreviewBanner } from '@/components/city-guides/draft-preview-banner';

export const revalidate = 60;

type PageProps = {
  params: { slug: string };
  searchParams?: { preview?: string };
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const previewToken = searchParams?.preview ?? null;
  const data = await getCityGuidePageData(params.slug, { previewToken });
  if (!data) {
    return { title: 'City guide | IRL' };
  }
  const title = `${hubListTitle(data.row)} | IRL`;
  const description =
    data.row.card_preview?.trim() ||
    data.row.lead_headline?.trim() ||
    'IRL city guide';
  if (previewToken) {
    return { title, description, robots: { index: false, follow: false } };
  }
  return { title, description };
}

function interactiveMapHrefForLocation(
  returnPath: string,
  placeId: string,
  lat: number,
  lng: number
) {
  const q = new URLSearchParams();
  q.set('placeId', placeId);
  q.set('lat', String(lat));
  q.set('lng', String(lng));
  q.set('mapCard', '1');
  q.set('returnTo', returnPath);
  return `/interactive-map?${q.toString()}`;
}

function interactiveMapLaunchHref(returnPath: string) {
  const q = new URLSearchParams();
  q.set('returnTo', returnPath);
  return `/interactive-map?${q.toString()}`;
}

function contributorLineForLocation(
  placeId: string,
  overrides: Map<string, string>,
  guideContributors: readonly string[]
): string {
  const fromOverride = overrides.get(placeId)?.trim();
  if (fromOverride) return fromOverride;
  if (guideContributors.length === 0) return '';
  if (guideContributors.length === 1) return guideContributors[0];
  return guideContributors.join(', ');
}

export default async function CityGuideBySlugPage({
  params,
  searchParams,
}: PageProps) {
  const previewToken = searchParams?.preview ?? null;
  const data = await getCityGuidePageData(params.slug, { previewToken });
  if (!data) {
    notFound();
  }

  const showDraftPreviewBanner = Boolean(previewToken);

  const {
    row,
    contributors,
    contributorNames,
    locations,
    locationContributorByPlaceId,
  } = data;
  const returnPath = `/city-guides/${row.slug}`;
  const mapHeading = 'In This Guide';
  const leadParagraphs = row.lead_paragraphs?.filter((p) => p.trim()) ?? [];
  const headline = row.lead_headline?.trim() ?? '';

  return (
    <div className="min-h-screen w-full bg-[#F5F5F5] font-grotesk">
      {showDraftPreviewBanner ? <DraftPreviewBanner guideId={row.id} /> : null}
      <div className="mx-auto w-full max-w-[393px] rounded-[48px] bg-[var(--Backgrounds-Background,#FFF)] shadow-sm">
        <header className="sticky top-0 z-30 rounded-t-[48px] bg-[var(--Backgrounds-Background,#FFF)] pt-[max(8px,env(safe-area-inset-top))]">
          <CityGuideArticleNav />
        </header>

        <article className="px-4 pb-16 pt-2">
          <CityGuideArticleTitle
            titlePrefix={row.title_prefix?.trim() ?? ''}
            cityName={row.city_name?.trim() ?? ''}
            contributors={contributorNames}
            className="mb-4"
          />

          <CityGuideArticleMetaRow
            guideKind="city-guide"
            contributors={contributorNames}
            className="mb-8"
          />

          <CityGuideArticleHeroImage
            src={row.hero_image_url}
            alt={row.hero_image_alt}
            className="mb-[20px]"
          />

          {headline || leadParagraphs.length > 0 ? (
            <CityGuideArticleDescription
              headline={headline}
              paragraphs={leadParagraphs}
              className="mb-10"
            />
          ) : null}

          {contributors.length > 0 ? (
            <GuideArticleContributorsSection
              contributors={contributors}
              className="mb-10"
            />
          ) : null}

          {row.map_image_url ? (
            <section
              className="-mx-4 box-border flex h-[439px] w-[calc(100%+2rem)] max-w-[393px] shrink-0 flex-col px-4 pb-3 pt-3 opacity-100"
              aria-label={mapHeading}
            >
              <h2 className="title3 flex h-[54px] w-full max-w-[361px] shrink-0 items-center text-[#171717]">
                {mapHeading}
              </h2>
              <div className="h-[361px] w-full max-w-[361px] shrink-0 overflow-hidden">
                <CityGuideTexturedImage
                  src={row.map_image_url}
                  alt={row.map_image_alt ?? 'Map for this guide'}
                  sizes="361px"
                  containerClassName="h-full w-full"
                  textureSrc={null}
                />
              </div>
            </section>
          ) : null}

          {locations.length === 0 ? (
            <p className="body-medium mt-6 text-[#757575]">
              No venues linked to this guide yet. Choose a location list in
              Admin → Guides, or add venues in Admin → Location Lists.
            </p>
          ) : (
            locations.map((entry, index) => {
              const loc = entry.location;
              const description =
                loc.description?.trim() || loc.address?.trim() || '—';
              const isLast = index === locations.length - 1;
              return (
                <CityGuideLocationCard
                  key={entry.membership_id}
                  name={loc.name}
                  description={description}
                  imageSrc={loc.coin_image_url ?? null}
                  imageAlt={`${loc.name} — location photo`}
                  contributorName={contributorLineForLocation(
                    loc.place_id,
                    locationContributorByPlaceId,
                    contributorNames
                  )}
                  mapHref={interactiveMapHrefForLocation(
                    returnPath,
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
              href={interactiveMapLaunchHref(returnPath)}
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

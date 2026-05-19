import type { Metadata } from 'next';
import { CityGuidesHubSection } from '@/components/city-guides/city-guides-hub-section';
import FeaturedEditorialHeroCard from '@/components/city-guides/featured-editorial-hero-card';
import MapNav, { MAP_NAV_SAFE_AREA_X } from '@/components/map/mapnav';
import { cn } from '@/lib/utils';
import { getFeaturedGuide, getPublishedGuides } from '@/lib/db/guides';

export const metadata: Metadata = {
  title: 'City Guides | IRL',
  description: 'IRL city guides and editorials — culture, curated.',
};

/** CMS reads Supabase at request time; avoid build-time prerender when `guides` is not migrated yet. */
export const dynamic = 'force-dynamic';

export default async function CityGuidesHomePage() {
  const featured = await getFeaturedGuide();
  const listRows = await getPublishedGuides(
    featured ? { excludeId: featured.id } : undefined
  );
  const hasPublishedGuides = listRows.length > 0;

  return (
    <main className="min-h-screen w-full bg-[#F5F5F5] font-grotesk">
      <div className="bg-white pt-4">
        <div className="mx-auto w-full max-w-[393px] ">
          <MapNav
            className={cn(MAP_NAV_SAFE_AREA_X, 'max-w-none')}
            menuButtonClassName="bg-[#DBDBDB] hover:bg-[#c9c9c9]"
          />
        </div>
      </div>

      {featured ? (
        <FeaturedEditorialHeroCard
          guideKind={featured.guideKind}
          titleLine1={featured.titleLine1}
          titleHighlightWords={featured.titleHighlightWords}
          featuredPeople={featured.featuredPeople}
          heroImageSrc={featured.heroImageSrc}
          heroImageAlt={featured.heroImageAlt}
          readHref={featured.readHref}
        />
      ) : !hasPublishedGuides ? (
        <section className="mx-auto flex min-h-[200px] w-full max-w-[393px] items-center justify-center bg-neutral-900 px-4 py-12 text-center">
          <p className="body-medium text-white/80">
            No published guides yet. Add and publish guides in Admin → Guides.
          </p>
        </section>
      ) : null}

      {hasPublishedGuides ? (
        featured ? (
          <div className="w-full bg-white">
            <div className="mx-auto w-full max-w-[393px]  pb-16">
              <CityGuidesHubSection entries={listRows} />
            </div>
          </div>
        ) : (
          <section className="w-full border-t border-[#E5E5E5] bg-white">
            <div className="mx-auto w-full max-w-[393px] px-4 pb-16">
              <CityGuidesHubSection entries={listRows} />
            </div>
          </section>
        )
      ) : null}
    </main>
  );
}

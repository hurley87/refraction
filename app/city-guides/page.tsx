import type { Metadata } from 'next';
import CityGuideListCard from '@/components/city-guides/city-guide-list-card';
import CityGuidesContentFilterRow from '@/components/city-guides/city-guides-content-filter-row';
import FeaturedEditorialHeroCard from '@/components/city-guides/featured-editorial-hero-card';

export const metadata: Metadata = {
  title: 'City Guides | IRL',
  description: 'IRL city guides and editorials — culture, curated.',
};

/** Static placeholder content until CMS powers guides. */
const FEATURED_MIAMI = {
  guideKind: 'city-guide' as const,
  titleLine1: 'The IRL Guide To',
  titleLine2: 'Miami',
  featuredPeople: ['NICHOLAS PADILLA', 'bITTER BABE', 'INVT'],
  heroImageSrc: '/city-guides/miami/miami-hero-card.png',
  heroImageAlt: 'Miami skyline and palm trees',
  readHref: '/city-guides/template',
};

/** Placeholder rows until CMS; replace with API-driven data. */
const PLACEHOLDER_GUIDE_CARDS = [
  {
    guideKind: 'city-guide' as const,
    title: 'The IRL Guide To Singapore',
    preview:
      'Hawker stalls, rooftop bars, and the neighborhoods worth walking when the humidity breaks.',
    publishedAt: '2025-08-14',
    imageSrc: '/city-guides/miami/miami-hero-card.png',
    imageAlt: 'Placeholder city skyline',
    readHref: '/city-guides/template',
  },
  {
    guideKind: 'city-guide' as const,
    title: 'The IRL Guide To Mexico City',
    preview:
      'From Roma Norte galleries to late-night tacos—your starter map for a long weekend.',
    publishedAt: '2025-06-02',
    imageSrc: '/city-guides/miami/miami-hero-card-full.jpg',
    imageAlt: 'Placeholder street scene',
    readHref: '#',
  },
  {
    guideKind: 'editorial' as const,
    title: 'Night Markets & Neighbors',
    preview:
      'Why the best line at the stall is never the shortest, and other rules we keep breaking.',
    publishedAt: '2025-04-20',
    imageSrc: '/city-guides/miami/miami-hero-card.png',
    imageAlt: 'Placeholder market lights',
    readHref: '/city-guides/editorial/template',
  },
  {
    guideKind: 'editorial' as const,
    title: 'Art Week, Unpacked',
    preview:
      'Openings, after-parties, and the quiet rooms worth skipping the queue for.',
    publishedAt: '2025-01-11',
    imageSrc: '/city-guides/miami/miami-hero-card-full.jpg',
    imageAlt: 'Placeholder gallery interior',
    readHref: '/city-guides/editorial/template',
  },
];

export default function CityGuidesHomePage() {
  return (
    <main className="min-h-screen w-full bg-[#F5F5F5] font-grotesk">
      <FeaturedEditorialHeroCard
        guideKind={FEATURED_MIAMI.guideKind}
        titleLine1={FEATURED_MIAMI.titleLine1}
        titleLine2={FEATURED_MIAMI.titleLine2}
        featuredPeople={FEATURED_MIAMI.featuredPeople}
        heroImageSrc={FEATURED_MIAMI.heroImageSrc}
        heroImageAlt={FEATURED_MIAMI.heroImageAlt}
        readHref={FEATURED_MIAMI.readHref}
      />

      <section className="w-full border-t border-[#E5E5E5] bg-white">
        <div className="mx-auto w-full max-w-[393px] px-4 pb-16">
          <CityGuidesContentFilterRow />

          <div className="flex flex-col">
            {PLACEHOLDER_GUIDE_CARDS.map((item, index) => (
              <CityGuideListCard
                key={`${item.title}-${index}`}
                guideKind={item.guideKind}
                title={item.title}
                preview={item.preview}
                publishedAt={item.publishedAt}
                imageSrc={item.imageSrc}
                imageAlt={item.imageAlt}
                readHref={item.readHref}
                className={index === 0 ? 'border-t-0' : undefined}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

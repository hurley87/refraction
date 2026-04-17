import type { Metadata } from 'next';

import { CityGuideArticleNav } from '@/components/city-guides/city-guide-article-nav';
import { CityGuideArticleDescription } from '@/components/city-guides/city-guide-article-description';
import { CityGuideArticleHeroImage } from '@/components/city-guides/city-guide-article-hero-image';
import { CityGuideArticleMetaRow } from '@/components/city-guides/city-guide-article-meta-row';
import { CityGuideArticleTitle } from '@/components/city-guides/city-guide-article-title';

export const metadata: Metadata = {
  title: 'City guide template | IRL',
  description:
    'Layout template for a city guide article — populate from CMS when ready.',
};

/** Lead paragraphs after hero; first = Title4 semibold, rest = Body Medium. */
const TEMPLATE_LEAD_PARAGRAPHS = [
  'For over 15 years, Michail Stangl, aka Opium Hum, has been a vital node in the global electronic music underground. Best known as the former face and lead programmer of Boiler Room and as curator of Berlin’s legendary CTM Festival, Stangl’s work has consistently mapped the bleeding edges of contemporary club culture.',
];

/** Placeholder sections; replace with CMS-driven blocks or HTML. */
const TEMPLATE_PLACEHOLDER_SECTIONS = [
  {
    id: 'neighborhoods',
    title: 'Neighborhoods',
    body: [
      'Add as many sections as you need — the page height grows with the content.',
      'Keep images and embeds inside the same max-width column for alignment with the design grid.',
    ],
  },
  {
    id: 'logistics',
    title: 'Logistics',
    body: [
      'Placeholder structure lives in `app/city-guides/template/page.tsx`. Map the same fields from your CMS when you are ready.',
    ],
  },
] as const;

/** Template hero; replace with CMS fields. */
const TEMPLATE_HERO = {
  guideKind: 'city-guide' as const,
  titlePrefix: 'The IRL Guide to',
  cityName: 'Berlin',
  contributors: ['Michail Stangl'] as const,
  heroImageSrc: '/city-guides/berlin/michail-stangl-hero.jpg',
  heroImageAlt: 'Berlin — hero photograph for the city guide',
};

export default function CityGuideTemplatePage() {
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
            paragraphs={TEMPLATE_LEAD_PARAGRAPHS}
            className="mb-10"
          />

          <div className="flex flex-col gap-10">
            {TEMPLATE_PLACEHOLDER_SECTIONS.map((section) => (
              <section key={section.id} className="flex flex-col gap-3">
                <h2 className="title2 font-bold text-[#313131]">
                  {section.title}
                </h2>
                {section.body.map((paragraph, i) => (
                  <p
                    key={`${section.id}-${i}`}
                    className="body-medium text-[#313131]"
                  >
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';

import { WelcomeEllipse } from '@/components/shared/welcome-ellipse';
import { guideReadHref, type GuideKindDb } from '@/lib/guides/guide-paths';

/** Homepage carousel entries — `slug` must match Admin → Guides. */
const COVER_GUIDES: {
  src: string;
  alt: string;
  name: string;
  slug: string;
  kind: GuideKindDb;
}[] = [
  {
    src: '/homepage/city-guides-covers/miami.png',
    alt: 'The IRL Guide to Miami with Nicholas G. Padilla, INVT & Bitter Babe',
    name: 'The IRL Guide to Miami with Nicholas G. Padilla, INVT & Bitter Babe',
    slug: 'irl-guide-to-miami',
    kind: 'city_guide',
  },
  {
    src: '/homepage/city-guides-covers/montreal.jpg',
    alt: '5 Montréal Corners That Feel Like Home with Ekitwanda',
    name: '5 Montréal Corners That Feel Like Home with Ekitwanda',
    slug: '5-montreal-corners-that-feel-like-home-ekitwanda',
    kind: 'city_guide',
  },
  {
    src: '/homepage/city-guides-covers/berlin.jpg',
    alt: 'The IRL Guide to Berlin with Michail Stangl',
    name: 'The IRL Guide to Berlin with Michail Stangl',
    slug: 'berlin-michail-stangl',
    kind: 'city_guide',
  },
  {
    src: '/homepage/city-guides-covers/danielle-guide.jpg',
    alt: 'A Freelancer’s Lower Manhattan Day Circuit with Danielle Paterson',
    name: 'A Freelancer’s Lower Manhattan Day Circuit with Danielle Paterson',
    slug: 'a-freelancers-lower-manhattan-day-circuit-with-danielle-paterson',
    kind: 'city_guide',
  },
  {
    src: '/homepage/city-guides-covers/tokyo.jpg',
    alt: 'A Tokyo Daily Loop with Benoît',
    name: 'A Tokyo Daily Loop with Benoît',
    slug: 'a-tokyo-daily-loop-with-benoit',
    kind: 'city_guide',
  },
];

/** "View all guides" CTA — shared mobile + desktop. */
function ViewAllGuidesButton({ className }: { className?: string }) {
  return (
    <Link href="/city-guides" className={className}>
      <span className="label-large flex h-11 min-h-[44px] w-full cursor-pointer items-center justify-between bg-[#454545] px-[var(--sds-size-space-400)] py-[var(--sds-size-space-200)] uppercase text-white">
        <span className="whitespace-nowrap">View All Guides</span>
        <svg
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
          aria-hidden
        >
          <path
            d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
            fill="currentColor"
          />
        </svg>
      </span>
    </Link>
  );
}

/** "Read More" affordance: underlined label + arrow on dark backgrounds. */
function ReadMore({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-[var(--sds-size-space-200)] border-b border-solid border-[#FFF] ${className ?? ''}`}
    >
      <span className="label-medium uppercase text-white">Read More</span>
      <svg
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 shrink-0"
        aria-hidden
      >
        <path
          d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
          fill="#FFFFFF"
        />
      </svg>
    </span>
  );
}

/** Desktop featured guide "Read more" row. */
function DesktopReadMore() {
  return <ReadMore className="w-[99px]" />;
}

/** Desktop carousel guide "Read more" row. */
function DesktopCarouselReadMore() {
  return <ReadMore />;
}

/**
 * City Guides Cover Carousel - Featured city guide cover images
 */
export default function CityGuidesCoverSection() {
  const heroGuide = COVER_GUIDES[0];
  const carouselGuides = COVER_GUIDES.slice(1);

  return (
    <section className="mx-auto flex w-full flex-col items-center self-stretch overflow-hidden bg-[#131313]">
      {/* Mobile layout */}
      <div className="flex w-full max-w-[393px] flex-col items-center gap-8 px-4 pt-16 pb-12 xl:hidden">
        {/* Subtitle block */}
        <div className="flex w-full max-w-[361px] flex-col items-start">
          <div className="flex w-full items-center gap-2">
            <WelcomeEllipse />
            <h2 className="title4 text-left text-white">City Guides</h2>
          </div>
          <div className="flex items-center gap-2 self-stretch py-4">
            <div className="title1 text-left font-normal text-white">
              Local knowledge, everywhere
            </div>
          </div>
        </div>

        {/* Featured hero — first guide */}
        {heroGuide && (
          <Link
            href={guideReadHref(heroGuide.slug, heroGuide.kind)}
            className="w-full"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-[#1a1a1a]">
              <Image
                src={heroGuide.src}
                alt={heroGuide.alt}
                fill
                priority
                className="object-cover"
                sizes="393px"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-3 p-4">
                <span className="title2 text-left text-white">
                  {heroGuide.name}
                </span>
                <ReadMore />
              </div>
            </div>
          </Link>
        )}

        {/* Remaining guides — horizontal carousel */}
        <div className="flex w-full snap-x snap-mandatory items-stretch gap-[21px] overflow-x-auto pb-6 scrollbar-hide">
          {carouselGuides.map((guide) => {
            const href = guideReadHref(guide.slug, guide.kind);
            return (
              <Link
                key={guide.slug}
                href={href}
                className="flex w-[214px] shrink-0 snap-start flex-col gap-4"
              >
                <div className="relative aspect-square w-[214px] overflow-hidden bg-[#1a1a1a]">
                  <Image
                    src={guide.src}
                    alt={guide.alt}
                    fill
                    className="object-cover"
                    sizes="214px"
                  />
                </div>
                <span className="title4 text-left text-white">
                  {guide.name}
                </span>
                <div className="mt-auto">
                  <ReadMore />
                </div>
              </Link>
            );
          })}
        </div>

        <ViewAllGuidesButton className="inline-flex w-full max-w-[361px]" />
      </div>

      {/* Desktop layout — three columns */}
      <div className="hidden h-[1080px] w-full items-center justify-center gap-8 self-stretch px-[var(--sds-size-space-0)] py-[120px] xl:flex">
        {/* Column 1: title + CTA */}
        <div className="flex h-[708px] flex-col items-start gap-2">
          <div className="flex h-[270px] w-[460px] shrink-0 flex-col items-start">
            <div className="flex items-center gap-2">
              <WelcomeEllipse />
              <h2 className="title4 text-left text-white">City Guides</h2>
            </div>
            <p className="title0 text-left text-white">
              Local knowledge, everywhere
            </p>
          </div>
          <ViewAllGuidesButton className="inline-flex w-[243px] shrink-0" />
        </div>

        {/* Column 2: featured cover */}
        {heroGuide ? (
          <Link
            href={guideReadHref(heroGuide.slug, heroGuide.kind)}
            className="flex h-[709px] w-[460px] shrink-0 flex-col items-start gap-2"
          >
            <div className="relative h-[577px] w-[460px] shrink-0 overflow-hidden bg-[#1a1a1a]">
              <Image
                src={heroGuide.src}
                alt={heroGuide.alt}
                fill
                priority
                className="object-cover"
                sizes="460px"
              />
            </div>
            <span className="title2 text-left text-white">
              {heroGuide.name}
            </span>
            <DesktopReadMore />
          </Link>
        ) : null}

        {/* Column 3: remaining guides grid */}
        <div className="flex h-[710px] w-[460px] shrink-0 flex-wrap content-start items-start gap-[var(--sds-size-space-800)] pb-[var(--sds-size-space-600)]">
          {carouselGuides.map((guide) => (
            <Link
              key={guide.slug}
              href={guideReadHref(guide.slug, guide.kind)}
              className="flex w-[214px] shrink-0 flex-col items-start gap-4"
            >
              <div className="relative aspect-square h-[214px] self-stretch overflow-hidden bg-[#1a1a1a]">
                <Image
                  src={guide.src}
                  alt={guide.alt}
                  fill
                  className="object-cover"
                  sizes="214px"
                />
              </div>
              <span className="title3 text-left text-white">{guide.name}</span>
              <DesktopCarouselReadMore />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

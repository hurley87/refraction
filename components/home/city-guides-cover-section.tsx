'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

const CARD_WIDTH = 252;
const GAP = 16;
const SCROLL_STEP = CARD_WIDTH + GAP;

/** Mobile "Read More" affordance: underlined label + arrow on dark backgrounds. */
function ReadMore() {
  return (
    <span className="inline-flex h-6 items-center gap-2 border-b border-white">
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

/**
 * City Guides Cover Carousel - Featured city guide cover images
 */
export default function CityGuidesCoverSection() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const delta = direction === 'left' ? -SCROLL_STEP : SCROLL_STEP;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateArrows]);

  const heroGuide = COVER_GUIDES[0];
  const carouselGuides = COVER_GUIDES.slice(1);

  return (
    <section className="mx-auto flex w-full flex-col items-center overflow-hidden bg-[#131313] md:mx-0 md:max-w-none md:overflow-x-visible md:px-4 md:py-24">
      {/* Mobile layout */}
      <div className="flex w-full max-w-[393px] flex-col items-center gap-8 px-4 pt-16 pb-12 md:hidden">
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

        {/* Read all guides */}
        <Link href="/city-guides" className="inline-flex w-full max-w-[361px]">
          <button
            type="button"
            className="label-large flex h-[44px] w-full cursor-pointer items-center justify-between bg-[#454545] text-white py-2 pr-2 pl-4 uppercase text-[#171717]"
          >
            <span className="whitespace-nowrap">VIEW ALL GUIDES</span>
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0 invert"
              aria-hidden
            >
              <path
                d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                fill="#171717"
              />
            </svg>
          </button>
        </Link>
      </div>

      {/* Desktop layout */}
      <div className="hidden w-full max-w-[1177px] md:mx-auto md:flex md:flex-row md:items-center md:gap-12 md:overflow-x-visible">
        {/* Left column: section content */}
        <div className="flex flex-col items-center gap-4 md:gap-[35px] md:items-start md:w-[574px] md:flex-none">
          <div className="flex items-center justify-start gap-2 mb-0 w-full">
            <WelcomeEllipse />
            <h2 className="title4 text-white text-left">City Guides</h2>
          </div>
          <div className="title1 mb-0 text-white text-left font-normal">
            Local knowledge, everywhere
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full -mx-2 md:mx-0 md:justify-start">
            <Link
              href="/city-guides"
              className="inline-flex w-[361px] max-w-full shrink-0"
            >
              <button
                type="button"
                className="label-large flex h-[44px] w-full cursor-pointer  uppercase items-center justify-between bg-[#ffffff] py-2 pr-2 pl-4 text-[#171717]"
              >
                <span className="whitespace-nowrap">Read the Guides</span>
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
                    fill="#171717"
                  />
                </svg>
              </button>
            </Link>
          </div>
        </div>

        {/* Right column: carousel + arrows (desktop) */}
        <div className="relative w-full md:flex-1 md:min-w-0">
          <button
            type="button"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label="Previous guides"
            className="absolute left-0 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-lg transition-opacity hover:bg-black/80 disabled:pointer-events-none disabled:opacity-30 md:flex"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div
            ref={scrollRef}
            onScroll={updateArrows}
            className="mb-0 grid auto-cols-[252px] grid-flow-col gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory scroll-smooth md:pl-14 md:pr-14"
          >
            {COVER_GUIDES.map((guide) => {
              const href = guideReadHref(guide.slug, guide.kind);
              return (
                <div
                  key={guide.slug}
                  className="group flex h-full min-h-0 min-w-0 snap-center flex-col items-center"
                  style={{ background: 'var(--Dark-Tint-100, #313131)' }}
                >
                  <Link href={href} className="block w-full">
                    <div
                      className="relative h-[251px] self-stretch overflow-hidden bg-[#1a1a1a]"
                      style={{ aspectRatio: '252/251' }}
                    >
                      <Image
                        src={guide.src}
                        alt={guide.alt}
                        fill
                        className="object-cover"
                        sizes="320px"
                      />
                    </div>
                  </Link>
                  <div className="flex min-h-0 flex-1 flex-col justify-between gap-4 self-stretch border-t border-white/25 pt-6 pr-6 pb-6 pl-6 md:gap-3 md:border-white md:pt-6 md:pr-6 md:pb-12 md:pl-6">
                    <span
                      className="min-w-0 self-stretch"
                      style={{
                        color: 'var(--UI-White, #FFF)',
                        fontFamily:
                          '"ABC Monument Grotesk Unlicensed Trial", "ABC-Monument-Grotesk", sans-serif',
                        fontSize: '25px',
                        fontStyle: 'normal',
                        fontWeight: 500,
                        lineHeight: '32px',
                        letterSpacing: '-0.25px',
                      }}
                    >
                      {guide.name}
                    </span>
                    <Link href={href} className="inline-flex w-full shrink-0">
                      <button
                        type="button"
                        className="label-large flex h-[44px] w-full cursor-pointer uppercase items-center justify-between bg-[#ffffff] py-2 pr-2 pl-4 text-[#171717]"
                      >
                        <span className="whitespace-nowrap">Read Guide</span>
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
                            fill="#171717"
                          />
                        </svg>
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label="Next guides"
            className="absolute right-0 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-lg transition-opacity hover:bg-black/80 disabled:pointer-events-none disabled:opacity-30 md:flex"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        {/* CTAs */}
      </div>
    </section>
  );
}

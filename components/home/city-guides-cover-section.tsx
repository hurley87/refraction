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
    src: '/homepage/city-guides-covers/jiminal.png',
    alt: 'City guide cover',
    name: "Jiminal's Hangover Guide to Amsterdam",
    slug: 'fermi-guide-to-amsterdam-with-jiminal',
    kind: 'city_guide',
  },
  {
    src: '/homepage/city-guides-covers/danielle-guide.jpg',
    alt: 'Danielle Paterson’s Guide to Lower Manhattan',
    name: 'Danielle Paterson’s Guide to Lower Manhattan',
    slug: 'a-freelancers-lower-manhattan-day-circuit-with-danielle-paterson',
    kind: 'city_guide',
  },
  {
    src: '/homepage/city-guides-covers/sunshine-cdmx.png',
    alt: 'Sunshine Vendetta’s Phone-Free Music Spots in CDMX',
    name: 'Sunshine Vendetta’s Phone-Free Music Spots in CDMX',
    slug: '6-phone-free-music-spots-in-mexico-city-with-sunshine-vendetta',
    kind: 'city_guide',
  },
  {
    src: '/homepage/city-guides-covers/jordan-denver.jpg',
    alt: 'Jordan Hubner’s Cultural Guide to Denver',
    name: 'Jordan Hubner’s Cultural Guide to Denver',
    slug: 'jordan-hubner-guide-to-culture-community-in-denver',
    kind: 'city_guide',
  },
  {
    src: '/homepage/city-guides-covers/meniac.png',
    alt: 'Meniac’s Disco Map to Amsterdam',
    name: "Meniac's Disco Map to Amsterdam",
    slug: 'digging-for-disco-and-asian-soul-meniac-fermi-map-to-amsterdam',
    kind: 'city_guide',
  },
];

const CARD_WIDTH = 252;
const GAP = 16;
const SCROLL_STEP = CARD_WIDTH + GAP;

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

  return (
    <section className="flex flex-col items-center w-full max-w-[393px] md:max-w-none min-h-[974px] md:min-h-0 bg-[#131313] pt-[128px] px-2 pb-0 md:py-24 md:px-4 overflow-hidden md:overflow-x-visible mx-auto md:mx-0">
      <div className="flex flex-col md:flex-row md:items-center gap-10 md:gap-12 w-full max-w-[393px] md:max-w-[1177px] mx-auto md:overflow-x-visible">
        {/* Left column: section content */}
        <div className="flex flex-col items-center gap-4 md:gap-[35px] md:items-start md:w-[574px] md:flex-none">
          <div className="flex items-center justify-start gap-2 mb-0 w-full">
            <WelcomeEllipse />
            <h2
              className="title5 text-white text-left"
              style={{ textShadow: 'rgba(255,255,255,0.7) 0px 0px 16px' }}
            >
              City Guides
            </h2>
          </div>
          <h3
            className="mb-0 text-left text-[31px] leading-[32px] tracking-[-0.93px] font-normal md:text-[39px] md:leading-[40px] md:tracking-[-0.39px] md:font-medium"
            style={{
              color: 'var(--UI-White, #FFF)',
              fontFamily:
                '"ABC Monument Grotesk Unlicensed Trial", "ABC-Monument-Grotesk", sans-serif',
              fontStyle: 'normal',
            }}
          >
            Local knowledge, everywhere
          </h3>
          <p
            className="mb-0 text-left max-w-[700px] mx-auto md:mx-0 md:max-w-none md:text-[20px] md:leading-[24px] md:tracking-[-0.4px]"
            style={{
              color: 'var(--UI-White, #FFF)',
              fontFamily:
                '"ABC Monument Grotesk Unlicensed Trial", "ABC-Monument-Grotesk", sans-serif',
              fontSize: '16px',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: '20px',
              letterSpacing: '-0.48px',
            }}
          >
            Curated guides from the people who know. Venue operators, DJs,
            artists share their cities. Not listicles. Not algorithms. Just
            locals who know.
          </p>
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

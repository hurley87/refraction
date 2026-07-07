'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { WelcomeEllipse } from '@/components/shared/welcome-ellipse';
import { cn } from '@/lib/utils';

/**
 * Hero background slides, cycled by the carousel. Order is the display order.
 * Mobile uses tall portrait assets; desktop (xl+) uses `-full` widescreen assets.
 */
type HeroCarouselSlide = {
  mobileSrc: string;
  desktopSrc?: string;
  alt: string;
  stepTitle: string;
  stepBody: string;
};

const HERO_CAROUSEL_SLIDES: HeroCarouselSlide[] = [
  {
    mobileSrc: '/homepage/hero/carousel/new-york.png',
    desktopSrc: '/homepage/hero/carousel/new-york-full.jpg',
    alt: 'New York',
    stepTitle: 'Explore Local Guides',
    stepBody: 'The best spots, hand-picked by people shaping the local scene.',
  },
  {
    mobileSrc: '/homepage/hero/carousel/denver.png',
    desktopSrc: '/homepage/hero/carousel/denver-full.jpg',
    alt: 'Denver',
    stepTitle: 'Check in at a spot',
    stepBody: 'Explore the map and check in at spots across your city.',
  },
  {
    mobileSrc: '/homepage/hero/carousel/amsterdam.png',
    desktopSrc: '/homepage/hero/carousel/amsterdam-full.jpg',
    alt: 'Amsterdam',
    stepTitle: 'Earn and spend rewards',
    stepBody: 'Earn points for future rewards at clubs, bars, and galleries',
  },
  {
    mobileSrc: '/homepage/hero/carousel/detroit.png',
    desktopSrc: '/homepage/hero/carousel/detroit-full.jpg',
    alt: 'Detroit',
    stepTitle: 'Earn and spend rewards',
    stepBody: 'Earn points for future rewards at clubs, bars, and galleries',
  },
];

const HERO_CAROUSEL_INTERVAL_MS = 5000;

/**
 * Hero component with a background image carousel above the fold.
 */
export default function Hero() {
  const slideCount = HERO_CAROUSEL_SLIDES.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goNext = useCallback(
    () => setActiveIndex((prev) => (prev + 1) % slideCount),
    [slideCount]
  );
  const goPrev = useCallback(
    () => setActiveIndex((prev) => (prev - 1 + slideCount) % slideCount),
    [slideCount]
  );
  const togglePause = useCallback(() => setIsPaused((prev) => !prev), []);

  // Auto-advance unless paused.
  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(goNext, HERO_CAROUSEL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isPaused, goNext]);

  const activeSlide = HERO_CAROUSEL_SLIDES[activeIndex];

  return (
    <>
      <section className="relative h-screen w-full overflow-hidden xl:aspect-video xl:h-auto xl:max-h-[100dvh]">
        {/* Hero background carousel */}
        <div className="absolute inset-0 p-0 pb-6 xl:pb-0">
          <div className="relative h-full w-full overflow-hidden xl:rounded-none">
            {HERO_CAROUSEL_SLIDES.map((slide, index) => (
              <div
                key={slide.mobileSrc}
                className={cn(
                  'absolute inset-0 transition-opacity duration-700 ease-in-out',
                  index === activeIndex ? 'opacity-100' : 'opacity-0'
                )}
              >
                <Image
                  src={slide.mobileSrc}
                  alt=""
                  fill
                  priority={index === 0}
                  sizes="100vw"
                  className="object-cover object-top xl:hidden"
                />
                <Image
                  src={slide.desktopSrc ?? slide.mobileSrc}
                  alt=""
                  fill
                  priority={index === 0}
                  sizes="100vw"
                  className="hidden object-cover object-center xl:block"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Content overlay - same layout on mobile and desktop */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 pt-20 pb-24">
          {/* Single column: ellipse + Welcome to IRL, headline */}
          <div className="flex flex-col w-full max-w-[574px] items-start">
            {/* Row 1: ellipse + Welcome to IRL (title5) */}
            <div className="flex items-center gap-2">
              <WelcomeEllipse />
              <span className="title4 text-white">Where to?</span>
            </div>

            {/* Headline block */}
            <h1 className="mt-[23px] flex flex-col justify-center self-stretch text-white">
              Your Global Guide To What&apos;s Good
            </h1>

            <p className="mt-[239px] title3 text-[#a9a9a9] uppercase">
              {activeSlide.alt}
            </p>
          </div>

          {/* Carousel controller — TEMPORARY placeholder; final design + SVGs pending */}
          <div className="absolute bottom-8 left-1/2 z-20 flex w-[393px] max-w-full -translate-x-1/2 flex-col gap-[9px] px-4 xl:w-[1444px] xl:items-start xl:px-0">
            <div className="flex w-full items-center justify-between self-stretch">
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous slide"
                className="flex items-center justify-center gap-[10.4px] p-[var(--sds-size-space-200)] transition-opacity hover:opacity-80"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="31.2"
                  height="31.2"
                  viewBox="0 0 32 32"
                  fill="none"
                  aria-hidden
                  className="aspect-square shrink-0"
                >
                  <path
                    d="M14.95 15.6L26 23.4V7.79999M14.3 23.4V7.79999L3.25 15.6L14.3 23.4Z"
                    fill="white"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={togglePause}
                aria-label={isPaused ? 'Play carousel' : 'Pause carousel'}
                className="flex items-center justify-center gap-[10.4px] p-[var(--sds-size-space-200)] text-white transition-opacity hover:opacity-80"
              >
                {isPaused ? (
                  <span aria-hidden className="text-[21px] leading-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="11"
                      height="13"
                      viewBox="0 0 11 13"
                      fill="none"
                    >
                      <path d="M0 0 L11 6.5 L0 13 Z" fill="white" />
                    </svg>
                  </span>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="31.2"
                    height="31.2"
                    viewBox="0 0 32 32"
                    fill="none"
                    aria-hidden
                    className="aspect-square shrink-0"
                  >
                    <path
                      d="M18.1998 24.7V6.5H23.3998V24.7H18.1998ZM7.7998 24.7V6.5H12.9998V24.7H7.7998Z"
                      fill="white"
                    />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next slide"
                className="flex items-center justify-center gap-[10.4px] p-[var(--sds-size-space-200)] transition-opacity hover:opacity-80"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="31.2"
                  height="31.2"
                  viewBox="0 0 32 32"
                  fill="none"
                  aria-hidden
                  className="aspect-square shrink-0"
                >
                  <path
                    d="M3.25 23.4V7.79999L14.95 15.6L3.25 23.4ZM16.25 23.4V7.79999L27.95 15.6L16.25 23.4Z"
                    fill="white"
                  />
                </svg>
              </button>
            </div>

            {/* Trackbar — one segment per slide; active segment is brighter */}
            <div
              className="flex h-0.5 w-full self-stretch items-center"
              aria-hidden
            >
              {HERO_CAROUSEL_SLIDES.map((slide, index) => (
                <div
                  key={`${slide.mobileSrc}-track`}
                  className={cn(
                    'h-0.5 min-w-0 flex-1 bg-white transition-opacity duration-700',
                    index === activeIndex ? 'opacity-100' : 'opacity-40'
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Boat quote — below the hero image, 144px from the image bottom */}
      <div className="mx-auto w-[393px] max-w-full px-4 pt-[144px] xl:w-[952px] xl:pt-[192px]">
        <p className="boat-quote xl:title0 xl:text-center min-h-[74px] w-full max-w-[574px] text-white xl:max-w-[952px]">
          From listening bars to late-night art shows, the people shaping the
          scene show you where to go.
        </p>
      </div>

      {/* How It Works card — follows the carousel's active step */}
      <div className="mx-auto w-[393px] max-w-full px-4 pt-24 xl:w-[553px] xl:px-0">
        <div className="flex h-[638px] w-[393px] max-w-full flex-col gap-6 text-white xl:h-auto xl:w-[553px] xl:items-center xl:pb-[174px] xl:text-center">
          {/* Row 1: label */}
          <div className="flex items-center gap-2 xl:mx-auto xl:w-[460px] xl:justify-center xl:gap-[var(--sds-size-space-200)] xl:text-center xl:items-center">
            <WelcomeEllipse />
            <span className="title4 pb-24 text-white xl:pb-0">
              How It Works
            </span>
          </div>

          {/* Benefit card — step number, title, body */}
          <div className="flex w-full flex-col items-center xl:h-[214px] xl:w-[553px] xl:items-center xl:gap-[var(--sds-size-space-200)] xl:p-[var(--sds-size-space-600)]">
            <span className="title2 text-center text-white xl:text-center">
              {activeIndex + 1}
            </span>
            <p
              className={cn(
                'mx-auto w-full self-stretch text-center text-white max-xl:boat-quote',
                'xl:title1 xl:mx-0 xl:w-full xl:text-center'
              )}
            >
              {HERO_CAROUSEL_SLIDES[activeIndex].stepTitle}
            </p>
            <p
              className={cn(
                'text-center text-white max-xl:body-largish',
                'xl:title3 xl:text-center'
              )}
            >
              {HERO_CAROUSEL_SLIDES[activeIndex].stepBody}
            </p>
          </div>

          {/* CTA */}
          <Link
            href="/interactive-map"
            className="block w-full pt-24 pb-[50px] xl:pt-0 xl:pb-0"
          >
            <button
              type="button"
              className="label-large flex h-[52px] min-h-[44px] w-full cursor-pointer items-center gap-[var(--sds-size-space-400)] bg-[var(--Backgrounds-Primary-CTA-BG,#FFF)] px-[var(--sds-size-space-400)] py-[var(--sds-size-space-200)] uppercase text-[#171717]"
            >
              <span className="whitespace-nowrap">Start Exploring</span>
              <svg
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="ml-auto shrink-0"
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
    </>
  );
}

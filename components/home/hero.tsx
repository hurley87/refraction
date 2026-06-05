'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { WelcomeEllipse } from '@/components/shared/welcome-ellipse';
import { cn } from '@/lib/utils';

/**
 * Hero background slides, cycled by the carousel. Order is the display order.
 * Each slide also carries the matching "How It Works" step content.
 */
const HERO_CAROUSEL_SLIDES = [
  {
    src: '/homepage/hero/carousel/denver.svg',
    alt: 'Denver',
    stepTitle: 'Explore Local Guides',
    stepBody: 'The best spots, hand-picked by people shaping the local scene.',
  },
  {
    src: '/homepage/hero/carousel/detroit.svg',
    alt: 'Detroit',
    stepTitle: 'Check in at a spot',
    stepBody: 'Explore the map and check in at spots across your city.',
  },
  {
    src: '/homepage/hero/carousel/singapore.svg',
    alt: 'Singapore',
    stepTitle: 'Earn and spend rewards',
    stepBody: 'Earn points for future rewards at clubs, bars, and galleries',
  },
] as const;

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

  return (
    <>
      <section className="relative w-full h-screen overflow-hidden">
        {/* Hero background carousel */}
        <div className="absolute inset-0 p-0 pb-6">
          <div className="relative w-full h-full rounded-[48px] overflow-hidden">
            {HERO_CAROUSEL_SLIDES.map((slide, index) => (
              <Image
                key={slide.src}
                src={slide.src}
                alt=""
                fill
                priority={index === 0}
                sizes="100vw"
                className={cn(
                  'object-contain object-top transition-opacity duration-700 ease-in-out',
                  index === activeIndex ? 'opacity-100' : 'opacity-0'
                )}
              />
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
          </div>

          {/* Divider accent anchored to bottom (mobile + desktop) */}
          <div className="absolute bottom-8 left-0 right-0 z-10 px-4">
            <div
              className="h-px w-full max-w-[574px] bg-white/50"
              aria-hidden
            />
          </div>

          {/* Carousel controller — TEMPORARY placeholder; final design + SVGs pending */}
          <div className="absolute bottom-8 left-1/2 z-20 flex w-[393px] max-w-full -translate-x-1/2 items-center justify-between px-4">
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
                    <path
                      d="M1.02101e-07 7.41488L12.843 -1.03373e-05L12.843 14.8298L1.02101e-07 7.41488Z"
                      fill="white"
                    />
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
        </div>
      </section>

      {/* Boat quote — below the hero image, 144px from the image bottom */}
      <div className="mx-auto w-[393px] max-w-full px-4 pt-[144px]">
        <p className="boat-quote min-h-[74px] w-full max-w-[574px] text-white">
          From listening bars to late-night art shows, the people shaping the
          scene show you where to go.
        </p>
      </div>

      {/* How It Works card — follows the carousel's active step */}
      <div className="mx-auto w-[393px] max-w-full px-4 pt-24">
        <div className="flex h-[638px] w-[393px] max-w-full flex-col gap-6 text-white">
          {/* Row 1: label */}
          <div className="flex items-center gap-2">
            <WelcomeEllipse />
            <span className="title4 text-white pb-24">How It Works</span>
          </div>

          {/* Row 2: step number */}
          <span className="title2 text-center text-white">
            {activeIndex + 1}
          </span>

          {/* Row 3: step title */}
          <p className="boat-quote self-stretch w-[300px] mx-auto text-center text-white">
            {HERO_CAROUSEL_SLIDES[activeIndex].stepTitle}
          </p>

          {/* Row 4: step description */}
          <p className="body-largish text-center text-normal text-white">
            {HERO_CAROUSEL_SLIDES[activeIndex].stepBody}
          </p>

          {/* CTA */}
          <Link
            href="/interactive-map"
            className="block w-full pt-24 pb-[50px]"
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

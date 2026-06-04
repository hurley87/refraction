'use client';


import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

import { WelcomeEllipse } from '@/components/shared/welcome-ellipse';
import { cn } from '@/lib/utils';

/** Hero background slides, cycled by the carousel. Order is the display order. */
const HERO_CAROUSEL_SLIDES = [
  { src: '/homepage/hero/carousel/denver.svg', alt: 'Denver' },
  { src: '/homepage/hero/carousel/detroit.svg', alt: 'Detroit' },
  { src: '/homepage/hero/carousel/singapore.svg', alt: 'Singapore' },
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
        <div className="absolute inset-0 p-0 md:p-4">
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
        <div className="relative z-10 flex flex-col items-center md:items-start justify-center h-full px-4 pt-20 pb-24 md:pt-0 md:pb-0 md:pl-[171px]">
          {/* Single column: ellipse + Welcome to IRL, headline, Join For Free (mobile: full width, desktop: 574px) */}
          <div className="flex flex-col w-full max-w-[574px] md:w-[574px] items-start">
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
          <div className="absolute bottom-8 left-0 right-0 z-10 px-4 md:px-0 md:pl-[171px]">
            <div
              className="h-px w-full max-w-[574px] md:w-[574px] bg-white/50"
              aria-hidden
            />
          </div>

          {/* Carousel controller — TEMPORARY placeholder; final design + SVGs pending */}
          <div className="absolute bottom-8 left-0 right-0 z-20 flex items-center justify-between self-stretch px-4">
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
                <span aria-hidden className="text-[31.2px] leading-none">
                  ▶
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
      <div className="px-4 pt-[144px] md:pl-[171px]">
        <p className="boat-quote min-h-[74px] w-full max-w-[574px] md:w-[574px] text-white">
          From listening bars to late-night art shows, the people shaping the
          scene show you where to go.
        </p>
      </div>
    </>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';

import { WelcomeEllipse } from '@/components/shared/welcome-ellipse';

/**
 * Hero component with background image above the fold
 */
export default function Hero() {
  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* Hero background image */}
      <div className="absolute inset-0 p-0 md:p-4">
        <div className="relative w-full h-full rounded-[48px] overflow-hidden">
          <Image
            src="/homepage/hero-image.jpg"
            alt=""
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </div>
      </div>

      {/* Content overlay - same layout on mobile and desktop */}
      <div className="relative z-10 flex flex-col items-center md:items-start justify-center h-full px-4 pt-20 pb-24 md:pt-0 md:pb-0 md:pl-[171px]">
        {/* Single column: ellipse + Welcome to IRL, headline, Join For Free (mobile: full width, desktop: 574px) */}
        <div className="flex flex-col w-full max-w-[574px] md:w-[574px] items-start gap-12">
          {/* Row 1: ellipse + Welcome to IRL (title5) */}
          <div className="flex items-center gap-2">
            <WelcomeEllipse />
            <span className="title5 text-white font-grotesk">
              Welcome to IRL
            </span>
          </div>

          {/* Headline block */}
          <div className="flex hero-text flex-col justify-center self-stretch text-white">
            Your Local Guide To What&apos;s Good Around The World
          </div>

          {/* CTA button */}
          <Link
            href="/interactive-map"
            className="inline-flex w-[361px] max-w-full shrink-0"
          >
            <button
              type="button"
              className="label-large flex h-[44px] w-full cursor-pointer items-center justify-between bg-[var(--Backgrounds-Highlight,#FFF200)] py-2 pr-2 pl-4 text-[#171717]"
            >
              <span className="whitespace-nowrap">Find Spots Nearby</span>
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

        {/* Subcopy anchored to bottom (mobile + desktop) */}
        <div className="flex flex-col gap-3.5 absolute bottom-8 left-0 right-0 z-10 px-4 md:px-0 md:pl-[171px]">
          <div
            className="h-px w-full max-w-[574px] md:w-[574px] bg-white/50"
            aria-hidden
          />
          <div className="flex min-h-[74px] w-full max-w-[574px] md:w-[574px] flex-col justify-center self-stretch text-white title3 font-grotesk">
            From listening bars to late-night art shows, the people shaping the
            scene show you where to go.
          </div>
        </div>
      </div>
    </section>
  );
}

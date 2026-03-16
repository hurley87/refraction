'use client';

import Link from 'next/link';
import Image from 'next/image';

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
            <Image
              src="/homepage/ellipse.svg"
              alt=""
              width={24}
              height={24}
              className="shrink-0"
            />
            <span className="title5 text-white font-grotesk">
              Welcome to IRL
            </span>
          </div>

          {/* Headline block */}
          <div className="flex hero-text flex-col justify-center self-stretch text-white">
            Your Local Guide To What&apos;s Good Around The World
          </div>

          {/* CTA button */}
          <Link href="/interactive-map" className="flex">
            <button className="flex h-[52px] py-3 px-6 justify-center items-center gap-2.5 rounded-full bg-white hover:bg-gray-100 transition-colors cursor-pointer title3 text-[#313131] font-grotesk whitespace-nowrap">
              Find Spots Nearby →
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
            From listening bars to late-night diners, the people shaping the
            scene show you where to go. Check in. Earn points. Fund the culture.
          </div>
        </div>
      </div>
    </section>
  );
}

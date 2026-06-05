'use client';

import Link from 'next/link';
import Image from 'next/image';

import { WelcomeEllipse } from '@/components/shared/welcome-ellipse';

const POSTER_SRC = '/homepage/irl-tour-june.png';

const DESKTOP_BG_IMAGE = '/homepage/irl-tour-june.png';

/**
 * IRL Tour section - Latest tour poster, Join Us Worldwide
 * DEV NOTE: Pull upcoming events dynamically from Dice integration or posters for now.
 */
export default function IRLTourSection() {
  return (
    <section className="relative w-full bg-[#131313] px-4 pt-[128px] pb-16 md:py-24 overflow-hidden">
      {/* Mobile-only: blurred background between section gutters (px-4) */}
      <div
        className="absolute inset-x-4 top-0 bottom-0 md:hidden bg-[#171717] bg-opacity-10  pointer-events-none"
        aria-hidden
      />

      <div className="flex items-center gap-2 mb-12 md:mb-0">
        <WelcomeEllipse />
        <span className="title4 text-white">IRL Picks</span>
      </div>

      <h2 className="title1 relative z-10 flex items-left justify-left gap-2 self-stretch pb-12 text-white">
        Upcoming Events
      </h2>

      {/* Desktop-only: blurred background layer */}
      <div
        className="absolute hidden md:block w-[2626px] h-[3499px] opacity-70 pointer-events-none"
        style={{
          left: '-580px',
          bottom: '-1465px',
          aspectRatio: '373/497',
          background: `url(${DESKTOP_BG_IMAGE}) lightgray 50% / cover no-repeat`,
          filter: 'blur(59.4px)',
        }}
        aria-hidden
      />

      <div className="relative z-10 max-w-[1177px] mx-auto flex flex-col md:flex-row md:items-center md:gap-[200px] w-full">
        {/* Left column: text content (on desktop); second on mobile */}
        <div className="order-2 md:order-1 flex flex-col flex-1 min-w-0 md:w-[574px] md:flex-none md:items-start md:gap-[35px]">
          {/* CTAs */}
          <div className="flex items-center justify-center mb-6 md:mb-0 w-full">
            <Link
              href="/events"
              className="inline-flex w-[361px] max-w-full shrink-0"
            >
              <button
                type="button"
                className="label-large flex h-[44px] w-full cursor-pointer uppercase items-center justify-between bg-[#ffffff] py-2 pr-2 pl-4 text-[#171717]"
              >
                <span className="whitespace-nowrap">Browse Events</span>
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

        {/* Right column: poster (on desktop); first on mobile — full content width */}
        <div className="order-1 md:order-2 relative w-full md:w-[500px] md:flex-shrink-0 aspect-[3/4] rounded-none mb-12 md:mb-0">
          <Image
            src={POSTER_SRC}
            alt="IRL Tour poster"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 500px"
            priority={false}
          />
        </div>
      </div>
    </section>
  );
}

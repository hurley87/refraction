'use client';

import Link from 'next/link';
import Image from 'next/image';

// Poster: Download from https://drive.google.com/file/d/1OO7axjl2A3u7msvuEHG6n7Li3YJCAfRi/view?usp=sharing
// Save to public/homepage/irl-tour-poster.jpg
const POSTER_SRC = '/homepage/irl-tour-latest.jpg';
const MOBILE_BG_IMAGE = '/homepage/irl-tour-latest.jpg';
const DESKTOP_BG_IMAGE = '/homepage/irl-tour-latest.jpg';

/**
 * IRL Tour section - Latest tour poster, Join Us Worldwide
 * DEV NOTE: Pull upcoming events dynamically from Dice integration or posters for now.
 */
export default function IRLTourSection() {
  return (
    <section className="relative w-full bg-[#131313] px-4 pt-[128px] pb-16 md:py-24 overflow-hidden">
      {/* Mobile-only: blurred background layer */}
      <div
        className="absolute md:hidden w-[640px] h-[852px] opacity-70 pointer-events-none"
        style={{
          right: '-124px',
          aspectRatio: '160/213',
          background: `url(${MOBILE_BG_IMAGE}) lightgray 50% / cover no-repeat`,
          filter: 'blur(59.4px)',
        }}
        aria-hidden
      />

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
          <div className="flex items-center justify-left gap-2 mb-4 md:mb-0">
            <Image
              src="/homepage/ellipse.svg"
              alt=""
              width={24}
              height={24}
              className="shrink-0"
            />
            <h2
              className="title5 text-left md:text-[13px] md:leading-[16px] md:font-medium md:tracking-[-0.39px]"
              style={{
                color: 'var(--UI-White, #FFF)',
                textShadow: '0 0 26.7px #FFF',
                fontFamily:
                  '"ABC Monument Grotesk Unlicensed Trial", "ABC-Monument-Grotesk", sans-serif',
                fontStyle: 'normal',
              }}
            >
              IRL Tour
            </h2>
          </div>
          <h3
            className="text-left mb-6 md:mb-0 text-[31px] leading-[32px] tracking-[-0.93px] md:text-[64px] md:leading-[64px] md:tracking-[-1.92px]"
            style={{
              color: 'var(--UI-White, #FFF)',
              textShadow: '0 0 26.7px #FFF',
              fontFamily:
                '"ABC Monument Grotesk Unlicensed Trial", "ABC-Monument-Grotesk", sans-serif',
              fontStyle: 'normal',
              fontWeight: 400,
            }}
          >
            Join Us Worldwide
          </h3>
          <p
            className="text-left max-w-[700px] mb-10 md:mb-0 md:max-w-none text-[16px] leading-[20px] tracking-[-0.48px] md:text-[20px] md:leading-[24px] md:tracking-[-0.4px]"
            style={{
              color: 'var(--UI-White, #FFF)',
              textShadow: '0 0 26.7px #FFF',
              fontFamily:
                '"ABC Monument Grotesk Unlicensed Trial", "ABC-Monument-Grotesk", sans-serif',
              fontStyle: 'normal',
              fontWeight: 400,
            }}
          >
            IRL Tour brings the community together in cities around the world.
            Check upcoming events, get tickets, experience the network IRL.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-4 mb-6 md:mb-0 w-full">
            <Link
              href="/events"
              className="w-full sm:w-auto min-w-0 md:flex-1 md:min-w-0"
            >
              <button className="flex flex-[1_0_0] self-stretch w-full md:w-full justify-center items-center gap-2.5 py-5 px-6 rounded-full cursor-pointer hover:bg-gray-100 transition-colors bg-white">
                <span
                  className="text-center"
                  style={{
                    color: 'var(--Black, #020303)',
                    fontFamily:
                      '"ABC Monument Grotesk Unlicensed Trial", "ABC-Monument-Grotesk", sans-serif',
                    fontSize: '20px',
                    fontStyle: 'normal',
                    fontWeight: 400,
                    lineHeight: '24px',
                    letterSpacing: '-0.4px',
                  }}
                >
                  Get Tickets
                </span>
              </button>
            </Link>

            <Link
              href="/partners"
              className="w-full sm:w-auto min-w-0 md:flex-1 md:min-w-0"
            >
              <button
                className="flex flex-[1_0_0] self-stretch w-full sm:w-auto md:w-full justify-center items-center gap-2.5 py-5 px-6 rounded-full cursor-pointer hover:bg-white/10 transition-colors"
                style={{ background: 'rgba(253, 255, 255, 0.15)' }}
              >
                <span
                  className="text-center"
                  style={{
                    color: 'var(--White, #FDFFFF)',
                    fontFamily:
                      '"ABC Monument Grotesk Unlicensed Trial", "ABC-Monument-Grotesk", sans-serif',
                    fontSize: '20px',
                    fontStyle: 'normal',
                    fontWeight: 400,
                    lineHeight: '24px',
                    letterSpacing: '-0.4px',
                  }}
                >
                  Host an Event
                </span>
              </button>
            </Link>
          </div>
        </div>

        {/* Right column: poster (on desktop); first on mobile */}
        <div className="order-1 md:order-2 relative w-[237px] mx-auto md:mx-0 md:w-[500px] md:flex-shrink-0 aspect-[3/4] rounded-none overflow-hidden mb-12 md:mb-0">
          <Image
            src={POSTER_SRC}
            alt="IRL Tour poster"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 237px, 500px"
            priority={false}
          />
        </div>
      </div>
    </section>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';

// DEV: Link destinations to be provided by Jim/Katie - update these as needed
const PARTNER_URL = '/partners'; // Partnerships page / form
const COMMUNITY_URL = 'https://t.me/irlnetwork'; // Telegram - update if Discord preferred
const MOBILE_BG_IMAGE = '/homepage/get-involved.png';
const DESKTOP_BG_IMAGE = '/homepage/get-involved.png';

/**
 * Get Involved section - Bring IRL to your city
 */
export default function GetInvolvedSection() {
  return (
    <section className="relative w-full h-[852px] md:h-auto flex flex-col md:flex-initial bg-[#131313] px-4 py-16 md:py-24 md:min-h-[860px] overflow-hidden">
      {/* Mobile-only: background image with fixed dimensions */}
      <div
        className="absolute md:hidden top-0 left-1/2 -translate-x-1/2 w-[568px] h-[852px] pointer-events-none"
        style={{
          aspectRatio: '2/3',
          background: `url(${MOBILE_BG_IMAGE}) lightgray 50% / cover no-repeat`,
        }}
        aria-hidden
      />

      {/* Desktop-only: background image scaled to section */}
      <div
        className="absolute inset-0 hidden md:block pointer-events-none"
        style={{
          background: `url(${DESKTOP_BG_IMAGE}) center / cover no-repeat`,
        }}
        aria-hidden
      />

      <div className="relative z-10 max-w-[1177px] mx-auto flex flex-col items-center text-center justify-center flex-1 min-h-0 md:flex-1 md:justify-center">
        <div className="flex flex-col items-center w-full md:w-[574px] md:gap-[35px]">
          <div className="flex items-center justify-center gap-2 mb-4 md:mb-0 mt-[210px] md:mt-0">
            <Image
              src="/homepage/ellipse.svg"
              alt=""
              width={24}
              height={24}
              className="shrink-0"
            />
            <h2
              className="title5 text-white text-center"
              style={{ textShadow: 'rgba(255,255,255,0.7) 0px 0px 16px' }}
            >
              Get Involved
            </h2>
          </div>
          <h3
            className="text-center mb-6 md:mb-0 text-[64px] leading-[64px] tracking-[-1.92px] md:text-[25px] md:leading-[32px] md:tracking-[-0.5px] md:font-pleasure md:font-medium"
            style={{
              color: 'var(--UI-White, #FFF)',
              textShadow: '0 0 26.7px #FFF',
              fontFamily:
                '"ABC Monument Grotesk Unlicensed Trial", "ABC-Monument-Grotesk", sans-serif',
              fontStyle: 'normal',
              fontWeight: 400,
            }}
          >
            Bring IRL to your city
          </h3>
          <p
            className="text-center max-w-[700px] mb-10 md:mb-0 text-[20px] leading-[24px] tracking-[-0.4px] md:text-[15px] md:leading-[24px] md:tracking-[-0.26px] body-medium font-grotesk"
            style={{
              color: 'var(--UI-White, #FFF)',
              textShadow: '0 0 26.7px #FFF',
              fontFamily:
                '"ABC Monument Grotesk Unlicensed Trial", "ABC-Monument-Grotesk", sans-serif',
              fontStyle: 'normal',
              fontWeight: 400,
            }}
          >
            Want to host an IRL Tour event? Add your venue to the network? Help
            fund local culture? Join the community building this.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full">
            <Link href={PARTNER_URL} className="w-full sm:w-auto">
              <button className="flex flex-[1_0_0] self-stretch w-full justify-center items-center gap-2.5 py-5 px-6 rounded-full cursor-pointer hover:bg-gray-100 transition-colors bg-white">
                <span
                  className="text-center text-[20px] leading-[24px] tracking-[-0.4px] md:font-pleasure md:font-medium md:text-[16px] md:leading-[16px] md:tracking-[-1.28px]"
                  style={{
                    color: 'var(--Black, #020303)',
                    fontFamily:
                      '"ABC Monument Grotesk Unlicensed Trial", "ABC-Monument-Grotesk", sans-serif',
                    fontStyle: 'normal',
                    fontWeight: 400,
                  }}
                >
                  Partner with IRL
                </span>
              </button>
            </Link>
            <Link
              href={COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
              aria-label="Join the community on Telegram"
            >
              <button
                className="flex flex-[1_0_0] self-stretch w-full justify-center items-center gap-2.5 py-5 px-6 rounded-full cursor-pointer hover:bg-white/10 transition-colors "
                style={{
                  background: 'rgba(253, 255, 255, 0.15)',
                  backdropFilter: 'blur(32px)',
                }}
              >
                <span
                  className="text-center text-[20px] leading-[24px] tracking-[-0.4px] md:font-pleasure md:font-medium md:text-[16px] md:leading-[16px] md:tracking-[-1.28px]"
                  style={{
                    color: 'var(--White, #FDFFFF)',
                    fontFamily:
                      '"ABC Monument Grotesk Unlicensed Trial", "ABC-Monument-Grotesk", sans-serif',
                    fontStyle: 'normal',
                    fontWeight: 400,
                  }}
                >
                  Join the community
                </span>
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

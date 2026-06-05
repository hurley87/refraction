'use client';

import Link from 'next/link';

const CONTACT_URL = `${process.env.NEXT_PUBLIC_BASE_URL}/contact-us`;
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
          <h1 className="text-center mb-6 md:mb-0  text-white leading-[64px] md:text-[64px] md:leading-[64px] md:tracking-[-1.92px] md:font-pleasure md:font-medium">
            Bring IRL To Your City
          </h1>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full">
            <Link
              href={CONTACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 self-center"
            >
              <button
                type="button"
                className="label-large flex h-[52px] min-h-[44px] w-[193px] cursor-pointer items-center gap-4 bg-[#ffffff] px-4 py-2 uppercase text-[#171717]"
              >
                <span className="whitespace-nowrap">Contact Us</span>
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
      </div>
    </section>
  );
}

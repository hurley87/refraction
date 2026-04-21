'use client';

import Link from 'next/link';
import Image from 'next/image';

import { WelcomeEllipse } from '@/components/shared/welcome-ellipse';

/**
 * Check-Ins Fund Culture section - Culture as infrastructure
 */
export default function CheckInsFundCultureSection() {
  return (
    <section className="w-full bg-[#131313] px-4 md:px-[171px] md:pr-[217px] py-16 md:py-24">
      <div className="max-w-[1177px] md:max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <WelcomeEllipse />
          <h2
            className="text-[#FFF] font-['ABC_Monument_Grotesk_Unlicensed_Trial',_sans-serif] text-[13px] font-medium leading-4 tracking-[-0.39px] text-center"
            style={{ textShadow: '0 0 26.7px #FFF' }}
          >
            Culture As Infrastructure
          </h2>
        </div>

        {/* Two-column row: image (left) + text (right) on desktop - fits within navbar width */}
        <div className="w-full max-w-7xl flex flex-col md:flex-row md:items-stretch md:justify-center gap-[9px] md:gap-[14px]">
          {/* Column 1: Image - aspect 691/461, flex to fit */}
          <div className="relative w-full aspect-[691/461] md:w-[50%] md:max-w-[694px] md:h-[463px] md:flex-none md:aspect-auto md:min-w-0 overflow-hidden bg-[#d3d3d3]">
            <Image
              src="/homepage/rasa-space.jpg"
              alt=""
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

          {/* Column 2: Text - flex to fit, padding 24 118 48 118, bg #313131; button at bottom */}
          <div className="flex flex-col justify-between items-center md:items-start text-center md:text-left gap-6 self-stretch py-6 px-4 md:py-6 md:px-[118px] md:pb-12 md:w-[50%] md:max-w-[692px] md:flex-none md:min-w-0 bg-[#313131] md:box-border">
            <div className="flex flex-col gap-6">
              <h3 className="text-[#FFF] font-['ABC_Monument_Grotesk_Unlicensed_Trial',_sans-serif] text-[39px] font-medium leading-[40px] tracking-[-0.39px]">
                Your Check-Ins Fund Culture
              </h3>
              <p className="max-w-[700px] md:max-w-none text-[#FFF] font-normal text-base leading-[22px] tracking-[-0.48px] font-['ABC_Monument_Grotesk_Semi-Mono_Unlicensed_Trial',_sans-serif]">
                Every transaction in the IRL network creates value. That value
                flows back to venues, artists, and the community. Your check-ins
                aren&apos;t just where you go—they&apos;re funding what happens
                next.
              </p>
            </div>
            <div className="flex justify-center md:justify-start w-full mt-6 md:mt-0">
              <Link href="/interactive-map">
                <button className="flex w-[220px] h-[52px] justify-center items-center gap-6 rounded-full bg-white cursor-pointer hover:bg-gray-100 transition-colors">
                  <span className="title3 text-[#313131] md:hidden">
                    Check In
                  </span>
                  <span className="title3 text-[#313131] hidden md:inline">
                    Check In
                  </span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

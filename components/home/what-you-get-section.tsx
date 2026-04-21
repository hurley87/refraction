'use client';

import Link from 'next/link';

import { WelcomeEllipse } from '@/components/shared/welcome-ellipse';

/**
 * What You Get section - Benefits of the IRL network
 */
export default function WhatYouGetSection() {
  return (
    <section
      className="w-full bg-[#131313] px-4 md:px-[171px] md:pr-[217px] py-16 md:py-24 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/homepage/what-you-get-bg.png')",
      }}
    >
      <div className="max-w-[1177px] md:max-w-7xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-12 md:mb-16">
          <WelcomeEllipse />
          <h2
            className="title5 leading-[28px] md:leading-[40px] tracking-[-0.5px] md:tracking-[-0.8px] text-white text-center"
            style={{ textShadow: 'rgba(255,255,255,0.7) 0px 0px 16px' }}
          >
            What You Get
          </h2>
        </div>

        <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-stretch">
          {/* Events */}
          <div className="flex flex-col items-start gap-3 self-stretch py-16 px-12 bg-[#313131] rounded-lg md:flex-1 md:min-w-0">
            <h3 className="title3 text-white">Events</h3>
            <p className="body-large text-[#b5b5b5] font-grotesk text-left">
              Local promoters and selected venues host
            </p>
          </div>

          {/* City Guides */}
          <div className="flex flex-col items-start gap-3 self-stretch py-16 px-12 bg-[#313131] rounded-lg md:flex-1 md:min-w-0">
            <h3 className="title3 text-white">City Guides</h3>
            <p className="body-large text-[#b5b5b5] font-grotesk text-left">
              Learn about the best spaces across the world from the people
              building local culture
            </p>
          </div>

          {/* City Guides - tokens */}
          <div className="flex flex-col items-start gap-3 self-stretch py-16 px-12 bg-[#313131] rounded-lg md:flex-1 md:min-w-0">
            <h3 className="title3 text-white">Global Perks</h3>
            <p className="body-large text-[#b5b5b5] font-grotesk text-left">
              Your tokens work anywhere in the network. Check in at a club in
              Tokyo, spend at a gallery in Mexico City
            </p>
          </div>
        </div>

        <div className="flex justify-center mt-12 md:mt-16">
          <Link
            href="/interactive-map"
            className="inline-flex items-center justify-center"
          >
            <button className="bg-white flex h-12 items-center justify-center gap-2 px-6 py-2 rounded-full cursor-pointer hover:bg-gray-100 transition-colors">
              <span className="title3 text-[#313131]">
                See What&apos;s Good Nearby
              </span>
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}

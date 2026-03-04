'use client';

import Link from 'next/link';
import Image from 'next/image';

// Poster: Download from https://drive.google.com/file/d/1OO7axjl2A3u7msvuEHG6n7Li3YJCAfRi/view?usp=sharing
// Save to public/homepage/irl-tour-poster.jpg
const POSTER_SRC = '/homepage/irl-tour-poster.jpg';

/**
 * IRL Tour section - Latest tour poster, Join Us Worldwide
 * DEV NOTE: Pull upcoming events dynamically from Dice integration or posters for now.
 */
export default function IRLTourSection() {
  return (
    <section className="w-full bg-[#131313] px-4 py-16 md:py-24">
      <div className="max-w-[1177px] mx-auto flex flex-col items-center">
        {/* Latest IRL Tour poster */}
        <div className="relative w-full max-w-[500px] aspect-[3/4] rounded-[17px] overflow-hidden mb-12 md:mb-16">
          <Image
            src={POSTER_SRC}
            alt="IRL Tour poster"
            fill
            className="object-cover"
            sizes="500px"
            priority={false}
          />
        </div>

        <h2
          className="text-[28px] leading-tight md:text-[40px] tracking-[-0.5px] md:tracking-[-0.8px] text-white font-pleasure font-medium mb-4 text-center"
          style={{ textShadow: 'rgba(255,255,255,0.7) 0px 0px 16px' }}
        >
          IRL Tour
        </h2>
        <h3 className="text-[20px] md:text-[25px] leading-[28px] md:leading-[32px] tracking-[-0.5px] text-white font-pleasure font-medium mb-6 md:mb-8 text-center">
          Join Us Worldwide
        </h3>
        <p className="body-medium text-[13px] leading-[20px] md:text-[15px] md:leading-[24px] tracking-[-0.26px] text-[#b5b5b5] font-grotesk text-center max-w-[700px] mb-10 md:mb-12">
          IRL Tour brings the community together in cities around the world.
          Check upcoming events, get tickets, experience the network IRL.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <Link href="/events">
            <button className="bg-white flex h-12 items-center justify-center gap-2 px-6 py-2 rounded-full cursor-pointer hover:bg-gray-100 transition-colors">
              <span className="font-pleasure font-medium text-[16px] leading-[16px] text-[#313131] tracking-[-1.28px]">
                Get Tickets
              </span>
              <Image src="/arrow-right.svg" alt="" width={24} height={24} />
            </button>
          </Link>
          <span className="text-[#b5b5b5] text-sm">or</span>
          <Link href="/partners">
            <button className="border border-white flex h-12 items-center justify-center gap-2 px-6 py-2 rounded-full cursor-pointer hover:bg-white/10 transition-colors">
              <span className="font-pleasure font-medium text-[16px] leading-[16px] text-white tracking-[-1.28px]">
                Host an Event
              </span>
            </button>
          </Link>
        </div>

        <Link
          href="/events"
          className="text-white font-grotesk text-[14px] underline hover:no-underline"
        >
          See upcoming events
        </Link>
      </div>
    </section>
  );
}

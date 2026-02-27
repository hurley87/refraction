'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * MapSection Component
 *
 * Uses GSAP ScrollTrigger to create smooth pinned transitions between sections.
 * Each section fades in/out smoothly while pinned to the viewport.
 */
export default function MapSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  const section1Ref = useRef<HTMLDivElement>(null);
  const section1TextRef = useRef<HTMLDivElement>(null);
  const section2Ref = useRef<HTMLDivElement>(null);
  const section2TextRef = useRef<HTMLDivElement>(null);
  const section3Ref = useRef<HTMLDivElement>(null);
  const section3TextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Early return if refs aren't ready or on server
    if (!containerRef.current || typeof window === 'undefined') return;

    const container = containerRef.current;

    // Check if we're on desktop (md breakpoint = 768px)
    const isDesktop = window.innerWidth >= 768;

    if (isDesktop) {
      // Desktop: Show all sections immediately, no animations
      gsap.set(section1Ref.current, { opacity: 1, y: 0 });
      gsap.set(section1TextRef.current, { opacity: 1, y: 0 });
      gsap.set(section2Ref.current, { opacity: 1, y: 0 });
      gsap.set(section2TextRef.current, { opacity: 1, y: 0 });
      gsap.set(section3Ref.current, { opacity: 1, y: 0 });
      gsap.set(section3TextRef.current, { opacity: 1, y: 0 });
      return; // Skip ScrollTrigger setup on desktop
    }

    // Mobile: Set initial states for scroll animation
    // Show first section immediately to avoid black gap
    gsap.set(section1Ref.current, { opacity: 1, y: 0 });
    gsap.set(section1TextRef.current, { opacity: 1, y: 0 });
    gsap.set(section2Ref.current, { opacity: 0, y: '100%' });
    gsap.set(section2TextRef.current, { opacity: 0, y: 50 });
    gsap.set(section3Ref.current, { opacity: 0, y: '100%' });
    gsap.set(section3TextRef.current, { opacity: 0, y: 50 });

    // Create main timeline with ScrollTrigger - longer duration for progressive reveals
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: () => `+=${window.innerHeight * 6}`, // Reduced from 8 to 6 since first section is already visible
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    // Section 1: Stage 1 - Hold section 1 visible briefly (already visible)
    tl.to({}, { duration: 0.3 });

    // Section 1: Stage 2 - Fade out
    tl.to(
      section1Ref.current,
      {
        opacity: 0,
        y: '-15%',
        duration: 0.8,
        ease: 'power1.inOut',
      },
      '+=0.1'
    );

    // Section 2: Stage 9 - Slide up rewards section
    tl.fromTo(
      section2Ref.current,
      { opacity: 0, y: '100%' },
      {
        opacity: 1,
        y: '0%',
        duration: 1.5,
        ease: 'power2.out',
      },
      '-=1'
    );

    // Section 2: Stage 10 - Fade in text
    tl.to(
      section2TextRef.current,
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power2.out',
      },
      '-=0.8'
    );

    // Section 2: Stage 11 - Hold fully visible
    tl.to({}, { duration: 0.4 });

    // Section 2: Stage 12 - Fade out
    tl.to(
      section2Ref.current,
      {
        opacity: 0,
        y: '-15%',
        duration: 0.8,
        ease: 'power1.inOut',
      },
      '+=0.1'
    );

    // Section 3: Stage 13 - Slide up unlock rewards section
    tl.fromTo(
      section3Ref.current,
      { opacity: 0, y: '100%' },
      {
        opacity: 1,
        y: '0%',
        duration: 1.5,
        ease: 'power2.out',
      },
      '-=1'
    );

    // Section 3: Stage 14 - Fade in text
    tl.to(
      section3TextRef.current,
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power2.out',
      },
      '-=0.8'
    );

    // Section 3: Stage 15 - Hold fully visible
    tl.to({}, { duration: 0.4 });

    // Cleanup function
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <section className="w-full">
      {/* How It Works: own full-screen "page" on mobile; inline on desktop */}
      <div className="min-h-screen md:min-h-0 flex flex-col items-center justify-center bg-[#131313] px-4 pt-8 pb-6 md:py-0 md:pb-12 md:pt-0">
         <h2
          className="display2 mt-4 md:mt-6 leading-[28px] md:leading-[40px] tracking-[-0.5px] md:tracking-[-0.8px] text-white text-center font-pleasure font-medium w-full"
          style={{ textShadow: 'rgba(255,255,255,0.7) 0px 0px 16px' }}
        >
          How It Works
        </h2>
          <div className="mt-24 md:mt-6"></div>
        <div className="w-full max-w-[389px] overflow-hidden rounded-[17px]">
          <Image
            src="/homepage/irl_denver.gif"
            alt="IRL Denver"
            width={389}
            height={220}
            className="w-full h-auto object-cover rounded-[17px]"
            unoptimized
          />
        </div>
      
       
      </div>

      {/* Pinned section: three steps (mobile). Desktop: three columns below header */}
      <div
        ref={containerRef}
        className="relative h-screen md:min-h-0 md:h-auto w-full overflow-hidden md:overflow-visible md:flex md:flex-col md:gap-0 md:px-[50px] pt-20 md:pt-0 md:pb-0"
      >
        <div className="relative flex-1 flex flex-col md:flex-row md:flex-initial md:gap-[108px] md:justify-center md:items-start w-full min-h-0">
          {/* Section 1: Discover and Check In */}
          <div
            ref={section1Ref}
            className="absolute md:relative inset-0 md:inset-auto flex flex-col items-center justify-start bg-[#131313] md:flex-1 md:max-w-[389px] md:min-w-0 md:h-auto md:justify-start md:overflow-visible"
          >
            {/* Top Half - Map Interface Image */}
            <div className="relative w-full h-[55vh] flex-shrink-0 flex items-center justify-center md:h-auto md:flex-none md:mb-[50px]">
              <div className="relative w-full h-full overflow-hidden rounded-b-[17px] md:rounded-t-[17px]">
                <Image
                  src="/homepage/irl-event.png"
                  alt="Check in map interface"
                  width={393}
                  height={498}
                  className="w-full h-full object-contain rounded-b-[17px] md:h-auto"
                  loading="lazy"
                  quality={85}
                />
              </div>
            </div>

            {/* Bottom Half - Content */}
            <div
              ref={section1TextRef}
              className="relative w-full flex-1 min-h-0 flex flex-col items-center justify-start px-4 pt-6 pb-4 md:flex-initial md:justify-center md:pb-8"
            >
              <div className="flex flex-col items-center gap-4 md:gap-0 max-w-[361px] w-full">
                <p
                  className="display2 text-[48px]leading-[48px] md:leading-[72px] tracking-[-3.84px] md:tracking-[-5px] text-white text-center font-pleasure font-bold uppercase"
                  style={{ textShadow: 'rgba(255,255,255,0.7) 0px 0px 16px' }}
                >
                  Follow Local Guides
                </p>
                <p
                  className="body-medium text-[13px] leading-[20px] md:leading-[24px] tracking-[-0.26px] md:tracking-[-0.32px] text-[#b5b5b5] text-center font-grotesk"
                  style={{ textShadow: 'rgba(255,255,255,0.7) 0px 0px 16px' }}
                >
                  Locate an IRL checkpoint, open the app and check in when you
                  show up.
                </p>
                <div className="mt-[16px] flex justify-center md:hidden">
                  <Image
                    src="/guidance_down-one-chevron.svg"
                    alt="Guidance chevron"
                    width={16}
                    height={16}
                    className="w-4 h-4"
                    style={{ filter: 'none', textShadow: 'none' }}
                  />
                </div>
                <div className="mt-2"></div>
              </div>
            </div>
          </div>

          {/* Section 2: Earn Points & Save */}
          <div
            ref={section2Ref}
            className="absolute md:relative inset-0 md:inset-auto flex flex-col items-center justify-start bg-[#131313] md:flex-1 md:max-w-[389px] md:min-w-0 md:h-auto md:justify-start md:overflow-visible"
          >
            {/* Top Half - Rewards Success Image */}
            <div className="relative w-full h-[55vh] flex-shrink-0 flex items-center justify-center md:h-auto md:flex-none md:mb-[50px]">
              <div className="relative w-full h-full overflow-hidden rounded-b-[17px]">
                <Image
                  src="/homepage/step-2.png?v=2"
                  alt="You earned 100 points"
                  width={393}
                  height={600}
                  className="w-full h-full object-contain rounded-b-[17px] md:h-auto"
                  loading="lazy"
                  quality={85}
                />
              </div>
            </div>

            {/* Bottom Half - Content */}
            <div
              ref={section2TextRef}
              className="relative w-full flex-1 min-h-0 flex flex-col items-center justify-start px-4 pt-6 pb-4 md:flex-initial md:justify-center md:pb-8"
            >
              <div className="flex flex-col items-center gap-4 md:gap-0 max-w-[361px] w-full">
                <p
                  className="display2 text-[48px] leading-[48px] md:leading-[72px] tracking-[-3.84px] md:tracking-[-5px] text-white text-center font-pleasure font-bold uppercase"
                  style={{ textShadow: 'rgba(255,255,255,0.7) 0px 0px 16px' }}
                >
                  Check In
                </p>
                <p
                  className="body-medium text-[13px]leading-[20px] md:leading-[24px] tracking-[-0.26px] md:tracking-[-0.32px] text-[#b5b5b5] text-center font-grotesk"
                  style={{ textShadow: 'rgba(255,255,255,0.7) 0px 0px 16px' }}
                >
                  Pay using $IRL to get lower prices on each ticket or drink you
                  buy, and earn IRL Points for every dollar spent.
                </p>
                <div className="mt-[16px] flex justify-center md:hidden">
                  <Image
                    src="/guidance_down-one-chevron.svg"
                    alt="Guidance chevron"
                    width={16}
                    height={16}
                    className="w-4 h-4"
                    style={{ filter: 'none', textShadow: 'none' }}
                  />
                </div>
                <div className="mt-2"></div>
              </div>
            </div>
          </div>

          {/* Section 3: Unlock Exclusive Rewards */}
          <div
            ref={section3Ref}
            className="absolute md:relative inset-0 md:inset-auto flex flex-col items-center justify-start bg-[#131313] md:flex-1 md:max-w-[389px] md:min-w-0 md:h-auto md:justify-start md:overflow-visible"
          >
            {/* Top Half - Unlock Rewards Image */}
            <div className="relative w-full h-[55vh] flex-shrink-0 flex items-center justify-center md:h-auto md:flex-none md:mb-[50px] px-[49px] md:px-0 md:scale-105">
              <div className="relative w-full h-full overflow-hidden rounded-b-[17px]">
                <Image
                  src="/homepage/step-3.jpg"
                  alt="Unlock exclusive rewards"
                  width={295.56}
                  height={376.83}
                  className="w-full h-full object-contain md:h-auto"
                  loading="lazy"
                  quality={85}
                />
              </div>
            </div>

            {/* Bottom Half - Content */}
            <div
              ref={section3TextRef}
              className="relative w-full flex-1 min-h-0 flex flex-col items-center justify-start px-4 pt-6 pb-4 md:flex-initial md:justify-center md:pb-8"
            >
              <div className="flex flex-col items-center gap-4 md:gap-0 max-w-[361px] w-full">
                <p
                  className="text-[48px] leading-[48px] md:leading-[72px] tracking-[-3.84px] display2 md:tracking-[-5px] text-white text-center font-pleasure font-bold uppercase"
                  style={{ textShadow: 'rgba(255,255,255,0.7) 0px 0px 16px' }}
                >
                  Earn and Spend
                </p>
                <p
                  className="body-medium text-[13px] leading-[20px] md:leading-[24px] tracking-[-0.26px] md:tracking-[-0.32px] text-[#b5b5b5] text-center font-grotesk"
                  style={{ textShadow: 'rgba(255,255,255,0.7) 0px 0px 16px' }}
                >
                  Redeem your IRL Points for exclusive perks, discounts, and
                  experiences at your favorite venues and events.
                </p>

                {/* Mobile: button below paragraph */}
                <Link
                  href="/interactive-map"
                  className="mt-6 w-full max-w-[260px] mx-auto md:hidden"
                >
                  <button className="bg-white flex h-12 items-center justify-center gap-2 px-4 py-2 rounded-full w-full cursor-pointer hover:bg-gray-100 transition-colors">
                    <span className="font-pleasure font-medium text-[16px] leading-[16px] text-[#313131] tracking-[-1.28px]">
                      Start Earning
                    </span>
                    <Image
                      src="/arrow-right.svg"
                      alt=""
                      width={24}
                      height={24}
                    />
                  </button>
                </Link>
                <div className="mt-2 md:hidden"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: Start Earning button below the steps section (outside pinned container so it's always visible) */}
      <div className="hidden md:block bg-[#131313] text-center py-8 px-4">
        <Link
          href="/interactive-map"
          className="inline-flex items-center justify-center"
        >
          <button className="bg-white flex h-12 items-center justify-center gap-2 px-6 py-2 rounded-full cursor-pointer hover:bg-gray-100 transition-colors">
            <span className="font-pleasure font-medium text-[16px] leading-[16px] text-[#313131] tracking-[-1.28px]">
              Start Earning
            </span>
            <Image src="/arrow-right.svg" alt="" width={24} height={24} />
          </button>
        </Link>
      </div>
    </section>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { WelcomeEllipse } from '@/components/shared/welcome-ellipse';
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
      {/* How It Works: compact on mobile; inline on desktop */}
      <div className="min-h-0 md:min-h-0 flex flex-col items-center justify-center bg-[#131313] px-4 pt-8 pb-0 md:py-0 md:pb-0 md:pt-0">
        <div className="flex items-center justify-center gap-2 mt-4 md:mt-6">
          <WelcomeEllipse />
          <h2
            className="title5  text-white text-center"
            style={{ textShadow: 'rgba(255,255,255,0.7) 0px 0px 16px' }}
          >
            How It Works
          </h2>
        </div>
      </div>

      {/* Pinned section: three steps (mobile). Desktop: three columns below header */}
      <div
        ref={containerRef}
        className="relative h-screen md:min-h-0 md:h-auto md:flex md:flex-col md:gap-0 pt-6 md:pt-[53px] md:pb-0 w-full overflow-y-hidden overflow-x-visible md:overflow-visible md:px-[171px] md:pr-[217px]"
      >
        <div className="relative flex-1 flex flex-col md:flex-row md:flex-initial md:gap-4 md:justify-center md:items-stretch w-full min-h-0 md:h-auto md:max-w-7xl md:mx-auto">
          {/* Section 1: Discover and Check In */}
          <div
            ref={section1Ref}
            className="absolute md:relative inset-0 md:inset-auto flex flex-col items-center justify-start bg-[#313131] md:flex-1 md:min-w-0 md:flex md:flex-col md:gap-0 md:items-stretch"
          >
            {/* Top row - Image: height 456px, aspect-ratio 1/1, align-self stretch */}
            <div className="relative w-full h-[55vh] flex-shrink-0 flex items-center justify-center md:h-[456px] md:aspect-square md:self-stretch md:flex-none">
              <div className="relative w-full h-full overflow-hidden rounded-b-[17px] md:rounded-none">
                <Image
                  src="/homepage/curated-list.jpg"
                  alt="IRL nightlife and cultural scene"
                  width={456}
                  height={456}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Bottom row - Text: flex column, padding 24 24 48 24, gap 12px, border-top */}
            <div
              ref={section1TextRef}
              className="relative w-full flex-1 min-h-0 flex flex-col items-center justify-start px-4 pt-6 pb-4 md:flex md:flex-col md:items-start md:gap-3 md:py-6 md:px-6 md:pb-12 md:self-stretch md:border-t md:border-white/25 "
            >
              <div className="flex flex-col items-center gap-4 md:gap-3 md:items-start max-w-[361px] w-full md:max-w-none">
                <p className="title2 text-white text-center md:text-left">
                  Find Curated Lists
                </p>
                <p className="body-large text-[#b5b5b5] text-center md:text-left font-grotesk">
                  The best spots, hand-picked by people shaping the local scene.
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
            className="absolute md:relative inset-0 md:inset-auto flex flex-col items-center justify-start bg-[#313131] w-[100vw] left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 md:w-auto md:flex-1 md:min-w-0 md:flex md:flex-col md:gap-0 md:items-stretch"
          >
            {/* Top row - Image: full width of section (100vw on mobile) */}
            <div className="relative w-full h-[55vh] flex-shrink-0 flex items-center justify-center md:h-[456px] md:aspect-square md:self-stretch md:flex-none">
              <div className="relative w-full h-full overflow-hidden rounded-b-[17px] md:rounded-none">
                <Image
                  src="/homepage/check-in-hires.jpg"
                  alt="Person checking in on phone"
                  width={456}
                  height={456}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Bottom row - Text: flex column, padding 24 24 48 24, gap 12px, border-top */}
            <div
              ref={section2TextRef}
              className="relative w-full flex-1 min-h-0 flex flex-col items-center justify-start px-4 pt-6 pb-4 md:flex md:flex-col md:items-start md:gap-3 md:py-6 md:px-6 md:pb-12 md:self-stretch md:border-t md:border-white/25"
            >
              <div className="flex flex-col items-center gap-4 md:gap-3 md:items-start max-w-[361px] w-full md:max-w-none ">
                <p className="title2 text-white text-center md:text-left  ">
                  Check In
                </p>
                <p className="body-large text-[#b5b5b5] text-center md:text-left font-grotesk">
                  Explore the map and check in at spots across your city.
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
            className="absolute md:relative inset-0 md:inset-auto flex flex-col items-center justify-start bg-[#313131] w-[100vw] left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 md:w-auto md:flex-1 md:min-w-0 md:flex md:flex-col md:gap-0 md:items-stretch"
          >
            {/* Top row - Image: full width of section (100vw on mobile) */}
            <div className="relative w-full h-[55vh] flex-shrink-0 flex items-center justify-center md:h-[456px] md:aspect-square md:self-stretch md:flex-none md:px-0">
              <div className="relative w-full h-full overflow-hidden rounded-b-[17px] md:rounded-none">
                <Image
                  src="/homepage/earn-spend.png?v=2"
                  alt="Unlock exclusive rewards"
                  width={456}
                  height={456}
                  className="w-full h-full object-contain md:object-cover"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Bottom row - Text: flex column, padding 24 24 48 24, gap 12px, border-top */}
            <div
              ref={section3TextRef}
              className="relative w-full flex-1 min-h-0 flex flex-col items-center justify-start px-4 pt-6 pb-4 md:flex md:flex-col md:items-start md:gap-3 md:py-6 md:px-6 md:pb-12 md:self-stretch md:border-t md:border-white/25"
            >
              <div className="flex flex-col items-center gap-4 md:gap-3 md:items-start max-w-[361px] w-full md:max-w-none">
                <p className="title2  text-white text-center md:text-left">
                  Earn Points
                </p>
                <p className="body-large text-[#b5b5b5] text-center md:text-left font-grotesk">
                  Earn points towards future rewards at clubs, bars, and
                  galleries — your first check-in gets you started.
                </p>

                {/* Mobile: button below paragraph */}
                <Link
                  href="/interactive-map"
                  className="mx-auto mt-6 inline-flex w-[361px] max-w-full shrink-0 md:hidden"
                >
                  <button
                    type="button"
                    className="label-large flex h-[44px] w-full cursor-pointer items-center justify-between bg-[var(--Backgrounds-Highlight,#FFF200)] py-2 pr-2 pl-4 text-[#171717]"
                  >
                    <span className="whitespace-nowrap">Get Started</span>
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
          className="inline-flex w-[361px] max-w-full shrink-0 items-center justify-center"
        >
          <button
            type="button"
            className="label-large flex h-[44px] w-full cursor-pointer items-center justify-between bg-[var(--Backgrounds-Highlight,#FFF200)] py-2 pr-2 pl-4 text-[#171717]"
          >
            <span className="whitespace-nowrap">Get Started</span>
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
    </section>
  );
}

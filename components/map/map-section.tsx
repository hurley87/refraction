"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

// Register GSAP plugins
if (typeof window !== "undefined") {
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
  const videoSectionRef = useRef<HTMLDivElement>(null);
  const stencilRef = useRef<HTMLDivElement>(null);
  const section1Ref = useRef<HTMLDivElement>(null);
  const section1TextRef = useRef<HTMLDivElement>(null);
  const section2Ref = useRef<HTMLDivElement>(null);
  const section2TextRef = useRef<HTMLDivElement>(null);
  const section3Ref = useRef<HTMLDivElement>(null);
  const section3TextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Early return if refs aren't ready or on server
    if (!containerRef.current || typeof window === "undefined") return;

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
    gsap.set(stencilRef.current, { opacity: 0 });
    gsap.set(section1Ref.current, { opacity: 0, y: "100%" });
    gsap.set(section1TextRef.current, { opacity: 0, y: 50 });
    gsap.set(section2Ref.current, { opacity: 0, y: "100%" });
    gsap.set(section2TextRef.current, { opacity: 0, y: 50 });
    gsap.set(section3Ref.current, { opacity: 0, y: "100%" });
    gsap.set(section3TextRef.current, { opacity: 0, y: 50 });

    // Create main timeline with ScrollTrigger - longer duration for progressive reveals
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top top",
        end: () => `+=${window.innerHeight * 8}`, // 8x longer for 4 sections
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    // Video Section: Stage 1 - Show video, hold briefly
    tl.to({}, { duration: 0 });

    // Video Section: Stage 2 - Fade in stencil overlay
    tl.to(
      stencilRef.current,
      {
        opacity: 1,
        duration: 0.1,
        ease: "power2.inOut",
      },
      "+=0.1",
    );

    // Video Section: Stage 3 - Hold stencil visible
    tl.to({}, { duration: 0.4 });

    // Video Section: Stage 4 - Fade out entire video section
    tl.to(
      videoSectionRef.current,
      {
        opacity: 0,
        y: "-15%",
        duration: 1,
        ease: "power1.inOut",
      },
      "+=0.1",
    );

    // Section 1: Stage 5 - Slide up map section
    tl.fromTo(
      section1Ref.current,
      { opacity: 0, y: "100%" },
      {
        opacity: 1,
        y: "0%",
        duration: 1.2,
        ease: "power2.out",
      },
      "-=0.8",
    );

    // Section 1: Stage 6 - Fade in text
    tl.to(
      section1TextRef.current,
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: "power2.out",
      },
      "-=0.4",
    );

    // Section 1: Stage 7 - Hold map and text together
    tl.to({}, { duration: 0.3 });

    // Section 1: Stage 8 - Fade out
    tl.to(
      section1Ref.current,
      {
        opacity: 0,
        y: "-15%",
        duration: 0.8,
        ease: "power1.inOut",
      },
      "+=0.1",
    );

    // Section 2: Stage 9 - Slide up rewards section
    tl.fromTo(
      section2Ref.current,
      { opacity: 0, y: "100%" },
      {
        opacity: 1,
        y: "0%",
        duration: 1.5,
        ease: "power2.out",
      },
      "-=1",
    );

    // Section 2: Stage 10 - Fade in text
    tl.to(
      section2TextRef.current,
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power2.out",
      },
      "-=0.8",
    );

    // Section 2: Stage 11 - Hold fully visible
    tl.to({}, { duration: 0.4 });

    // Section 2: Stage 12 - Fade out
    tl.to(
      section2Ref.current,
      {
        opacity: 0,
        y: "-15%",
        duration: 0.8,
        ease: "power1.inOut",
      },
      "+=0.1",
    );

    // Section 3: Stage 13 - Slide up unlock rewards section
    tl.fromTo(
      section3Ref.current,
      { opacity: 0, y: "100%" },
      {
        opacity: 1,
        y: "0%",
        duration: 1.5,
        ease: "power2.out",
      },
      "-=1",
    );

    // Section 3: Stage 14 - Fade in text
    tl.to(
      section3TextRef.current,
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power2.out",
      },
      "-=0.8",
    );

    // Section 3: Stage 15 - Hold fully visible
    tl.to({}, { duration: 0.4 });

    // Cleanup function
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-screen md:min-h-screen w-full overflow-hidden md:overflow-visible md:flex md:flex-row md:gap-[108px] md:justify-center md:items-start md:px-[187px] md:pt-[400px] md:pb-[900px]"
    >
      

      {/* Section 1: Discover and Check In */}
      <div
        ref={section1Ref}
        className="absolute md:relative inset-0 md:inset-auto flex flex-col items-center justify-center bg-[#131313] md:flex-1 md:max-w-[389px] md:min-w-0 md:h-full md:justify-start md:overflow-visible"
      >
        {/* Top Half - Map Interface Image */}
        <div className="relative w-full flex-1 flex items-center justify-center mb-[47px] md:flex-none md:mb-[50px]">
          <div className="relative w-full overflow-hidden rounded-b-[17px]  md:rounded-t-[17px]">
            <Image
              src="/homepage/homepage-checkin.svg"
              alt="Check in map interface"
              width={393}
              height={498}
              className="w-full h-auto object-contain rounded-b-[17px]"
              loading="lazy"
              quality={85}
            />
          </div>
        </div>

        {/* Bottom Half - Content */}
        <div
          ref={section1TextRef}
          className="relative w-full flex-1 flex flex-col items-center justify-center px-4 pb-20 md:pb-40"
        >
          <div className="flex flex-col items-center gap-4 max-w-[361px] w-full">
            <h3
              className="text-[25px]  leading-[28px] md:leading-[40px] tracking-[-0.5px] md:tracking-[-0.8px] text-white text-center font-pleasure font-medium"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Discover and
            </h3>
            <p
              className="display2 text-[48px]leading-[48px] md:leading-[72px] tracking-[-3.84px] md:tracking-[-5px] text-white text-center font-pleasure font-bold uppercase"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Check In
            </p>
            <p
              className="body-medium text-[13px] leading-[20px] md:leading-[24px] tracking-[-0.26px] md:tracking-[-0.32px] text-[#b5b5b5] text-center font-grotesk"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Show up and support underground venues in your city to begin your
              journey in the IRL network.
            </p>
            <div className="mt-2"></div>
          </div>
        </div>
      </div>

      {/* Section 2: Earn Points & Save */}
      <div
        ref={section2Ref}
        className="absolute md:relative inset-0 md:inset-auto flex flex-col items-center justify-center bg-[#131313] md:flex-1 md:max-w-[389px] md:min-w-0 md:h-full md:justify-start md:overflow-visible"
      >
        {/* Top Half - Rewards Success Image */}
        <div className="relative w-full flex-1 flex items-center justify-center mb-[47px] md:flex-none md:mb-[50px]">
          <div className="relative w-full overflow-hidden rounded-b-[17px]">
            <Image
              src="/homepage/homepage-earn-points.svg"
              alt="You earned 100 points"
              width={393}
              height={600}
              className="w-full h-auto object-contain rounded-b-[17px]"
              loading="lazy"
              quality={85}
            />
          </div>
        </div>

        {/* Bottom Half - Content */}
        <div
          ref={section2TextRef}
          className="relative w-full flex-1 flex flex-col items-center justify-center px-4 pb-20 md:pb-40"
        >
          <div className="flex flex-col items-center gap-4 max-w-[361px] w-full">
            <h3
              className="text-[25px] leading-[28px] md:leading-[40px] tracking-[-0.5px] md:tracking-[-0.8px] text-white text-center font-pleasure font-medium"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Earn Points &
            </h3>
            <p
              className="display2 text-[48px] leading-[48px] md:leading-[72px] tracking-[-3.84px] md:tracking-[-5px] text-white text-center font-pleasure font-bold uppercase"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Save
            </p>
            <p
              className="body-medium text-[13px]leading-[20px] md:leading-[24px] tracking-[-0.26px] md:tracking-[-0.32px] text-[#b5b5b5] text-center font-grotesk"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Pay using $IRL to get lower prices on each ticket or drink you buy, and earn IRL Points for every dollar spent.
            </p>
            <div className="mt-2"></div>
          </div>
        </div>
      </div>

      {/* Section 3: Unlock Exclusive Rewards */}
      <div
        ref={section3Ref}
        className="absolute md:relative inset-0 md:inset-auto flex flex-col items-center justify-center bg-[#131313] md:flex-1 md:max-w-[389px] md:min-w-0 md:h-full md:justify-start md:overflow-visible"
      >
        {/* Top Half - Unlock Rewards Image */}
        <div className="relative w-full flex-1 flex items-center justify-center mb-[47px] mt-[70px] md:flex-none md:mb-[50px] md:mt-0">
          <div className="relative w-full overflow-hidden rounded-b-[17px]">
            <Image
              src="/homepage/homepage-reward.svg"
              alt="Unlock exclusive rewards"
              width={295.56}
              height={376.83}
              className="w-full h-auto object-contain"
              loading="lazy"
              quality={85}
            />
          </div>
        </div>

        {/* Bottom Half - Content */}
        <div
          ref={section3TextRef}
          className="relative w-full flex-1 flex flex-col items-center justify-center px-4 pb-20 md:pb-40"
        >
          <div className="flex flex-col items-center gap-4 max-w-[361px] w-full">
            <h3
              className="text-[25px]  leading-[28px] md:leading-[40px] tracking-[-0.5px] md:tracking-[-0.8px] text-white text-center font-pleasure font-medium"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Unlock Exclusive
            </h3>
            <p
              className="text-[48px] leading-[48px] md:leading-[72px] tracking-[-3.84px] display2 md:tracking-[-5px] text-white text-center font-pleasure font-bold uppercase"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Rewards
            </p>
            <p
              className="body-medium text-[13px] leading-[20px] md:leading-[24px] tracking-[-0.26px] md:tracking-[-0.32px] text-[#b5b5b5] text-center font-grotesk"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Redeem your IRL Points for exclusive perks, discounts, and
              experiences at your favorite venues and events.
            </p>
            <div className="mt-20"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
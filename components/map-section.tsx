"use client";

import { useEffect, useRef } from "react";
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
  const section1Ref = useRef<HTMLDivElement>(null);
  const section1TextRef = useRef<HTMLDivElement>(null);
  const section2Ref = useRef<HTMLDivElement>(null);
  const section2TextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Early return if refs aren't ready or on server
    if (!containerRef.current || typeof window === "undefined") return;

    const container = containerRef.current;

    // Set initial states
    gsap.set(section1TextRef.current, { opacity: 0, y: 50 });
    gsap.set(section2Ref.current, { opacity: 0, y: "100%" });
    gsap.set(section2TextRef.current, { opacity: 0, y: 50 });

    // Create main timeline with ScrollTrigger - longer duration for progressive reveals
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top top",
        end: () => `+=${window.innerHeight * 4}`, // 4x longer for more stages
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    // Stage 1: Show map, hold briefly
    tl.to({}, { duration: 0.2 });

    // Stage 2: Fade in the bottom text content (Discover and Check In)
    tl.to(
      section1TextRef.current,
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: "power2.out",
      },
      "+=0.05",
    );

    // Stage 3: Hold both map and text visible together
    tl.to({}, { duration: 0.3 });

    // Stage 4: Start fading out section 1 (both map and text together)
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

    // Stage 5: Section 2 slides up while section 1 fades
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

    // Stage 6: Fade in section 2 bottom text
    tl.to(
      section2TextRef.current,
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power2.out",
      },
      "-=0.8", // Start fading in text before section 2 fully settles
    );

    // Stage 7: Hold section 2 fully visible
    tl.to({}, { duration: 0.4 });

    // Cleanup function
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden"
    >
      {/* Section 1: Discover and Check In */}
      <div
        ref={section1Ref}
        className="absolute inset-0 flex flex-col items-center justify-center bg-[#131313]"
      >
        {/* Top Half - Map Interface Image */}
        <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden">
          <div className="relative max-w-[393px] w-full h-full flex items-center justify-center overflow-hidden rounded-t-[17px]">
            <img
              src="/pre-checkin.png"
              alt="Check in map interface"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Bottom Half - Content */}
        <div
          ref={section1TextRef}
          className="relative w-full flex-1 flex flex-col items-center justify-center px-4 pb-20"
        >
          <div className="flex flex-col items-center gap-4 max-w-[361px] w-full">
            <p
              className="text-[25px] leading-[28px] tracking-[-0.5px] text-white text-center font-pleasure font-medium"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Discover and
            </p>
            <p
              className="text-[48px] leading-[48px] tracking-[-3.84px] text-white text-center font-pleasure font-bold uppercase"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Check In
            </p>
            <p
              className="text-[13px] leading-[20px] tracking-[-0.26px] text-[#b5b5b5] text-center font-mono"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Show up and support underground venues in your city to begin your
              journey in the IRL network.
            </p>
            <div className="mt-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                className="text-white"
              >
                <path
                  d="M7 10L12 15L17 10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Earn Points & Save */}
      <div
        ref={section2Ref}
        className="absolute inset-0 flex flex-col items-center justify-center bg-[#131313]"
      >
        {/* Top Half - Rewards Success Image */}
        <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden">
          <div className="relative max-w-[393px] w-full h-full flex items-center justify-center">
            <img
              src="/pre-save.png"
              alt="You earned 100 points"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Bottom Half - Content */}
        <div
          ref={section2TextRef}
          className="relative w-full flex-1 flex flex-col items-center justify-center px-4 pb-20"
        >
          <div className="flex flex-col items-center gap-[9px] max-w-[361px] w-full">
            <p
              className="text-[25px] leading-[28px] tracking-[-0.5px] text-white text-center font-pleasure font-medium"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Earn Points &
            </p>
            <p
              className="text-[48px] leading-[48px] tracking-[-3.84px] text-white text-center font-pleasure font-bold uppercase"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Save
            </p>
            <p
              className="text-[13px] leading-[20px] tracking-[-0.26px] text-[#b5b5b5] text-center font-mono"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Each visit, ticket, or drink you buy earns IRL Points, with extra
              rewards and lower prices when you pay using $IRL.
            </p>
            <div className="mt-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                className="text-white"
              >
                <path
                  d="M7 10L12 15L17 10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

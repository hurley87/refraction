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

    // Set initial states
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
        duration: 0.3,
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
      className="relative h-screen w-full overflow-hidden"
    >
      {/* Video Section: Earn Rewards Stencil */}
      <div
        ref={videoSectionRef}
        className="absolute inset-0 flex items-center justify-center bg-[#131313] overflow-visible"
      >
        {/* Gradient Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="relative w-full h-full flex items-center justify-center overflow-hidden md:rounded-none rounded-[26px]"
            style={{
              background:
                "var(--Gradients-Rewards-Pink, linear-gradient(0deg, rgba(0, 0, 0, 0.10) 0%, rgba(0, 0, 0, 0.10) 100%), linear-gradient(0deg, #FFE600 0%, #1BA351 36.06%, #61BFD1 65.39%, #EE91B7 100%))",
            }}
          />
        </div>

        {/* Text and Video Overlay */}
        <div
          ref={stencilRef}
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-visible px-4 py-8 md:py-8"
        >
          <div className="flex flex-col items-center gap-4 md:gap-2 w-full my-auto">
            <div className="flex flex-col items-center gap-4 md:gap-2 w-full max-w-2xl">
              <div
                className="font-pleasure title2 text-[30px] tracking-[-1px] md:text-[30px] md:leading-[40px] md:tracking-[-1px] uppercase text-white text-center w-3/4 py-4 md:py-0"
                style={{
                  textShadow: "0 0 24px rgba(255, 255, 255, 0.54)",
                }}
              >
                Earn Rewards For Showing Up To The Things You Love
              </div>
            </div>
            
            {/* Video */}
            <div className="relative w-full md:w-[50vw] aspect-video rounded-xl overflow-hidden">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              >
                <source src="/video-reel.mp4" type="video/mp4" />
              </video>
            </div>
            
            <div className="flex flex-col items-center gap-4 md:gap-2 w-full max-w-2xl">
              <div
                className="font-pleasure title2 text-[30px] tracking-[-1px] md:text-[40px] md:leading-[50px] md:tracking-[-1px] uppercase text-white text-center w-3/4 py-4 md:py-0"
                style={{
                  textShadow: "0 0 24px rgba(255, 255, 255, 0.54)",
                }}
              >
                Built By Artists, Curators, And Event Organizers
              </div>
            </div>
          </div>
        </div>
      </div>

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
          className="relative w-full flex-1 flex flex-col items-center justify-center px-4 pb-20 md:pb-40"
        >
          <div className="flex flex-col items-center gap-4 max-w-[361px] md:max-w-[600px] w-full">
            <p
              className="text-[25px] md:text-[36px] leading-[28px] md:leading-[40px] tracking-[-0.5px] md:tracking-[-0.8px] text-white text-center font-pleasure font-medium"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Discover and
            </p>
            <p
              className="text-[48px] md:text-[72px] leading-[48px] md:leading-[72px] tracking-[-3.84px] md:tracking-[-5px] text-white text-center font-pleasure font-bold uppercase"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Check In
            </p>
            <p
              className="text-[13px] md:text-[16px] leading-[20px] md:leading-[24px] tracking-[-0.26px] md:tracking-[-0.32px] text-[#b5b5b5] text-center font-mono"
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
          className="relative w-full flex-1 flex flex-col items-center justify-center px-4 pb-20 md:pb-40"
        >
          <div className="flex flex-col items-center gap-4 max-w-[361px] md:max-w-[600px] w-full">
            <p
              className="text-[25px] md:text-[36px] leading-[28px] md:leading-[40px] tracking-[-0.5px] md:tracking-[-0.8px] text-white text-center font-pleasure font-medium"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Earn Points &
            </p>
            <p
              className="text-[48px] md:text-[72px] leading-[48px] md:leading-[72px] tracking-[-3.84px] md:tracking-[-5px] text-white text-center font-pleasure font-bold uppercase"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Save
            </p>
            <p
              className="text-[13px] md:text-[16px] leading-[20px] md:leading-[24px] tracking-[-0.26px] md:tracking-[-0.32px] text-[#b5b5b5] text-center font-mono"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Each visit, ticket, or drink you buy earns IRL Points, with extra
              rewards and lower prices when you pay using $IRL.
            </p>
            <div className="mt-2"></div>
          </div>
        </div>
      </div>

      {/* Section 3: Unlock Exclusive Rewards */}
      <div
        ref={section3Ref}
        className="absolute inset-0 flex flex-col items-center justify-center bg-[#131313]"
      >
        {/* Top Half - Unlock Rewards Image */}
        <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden">
          <div className="relative max-w-[393px] w-full h-full flex items-center justify-center">
            <img
              src="/pre-unlock.png"
              alt="Unlock exclusive rewards"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Bottom Half - Content */}
        <div
          ref={section3TextRef}
          className="relative w-full flex-1 flex flex-col items-center justify-center px-4 pb-20 md:pb-40"
        >
          <div className="flex flex-col items-center gap-4 max-w-[361px] md:max-w-[600px] w-full">
            <p
              className="text-[25px] md:text-[36px] leading-[28px] md:leading-[40px] tracking-[-0.5px] md:tracking-[-0.8px] text-white text-center font-pleasure font-medium"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Unlock Exclusive
            </p>
            <p
              className="text-[48px] md:text-[72px] leading-[48px] md:leading-[72px] tracking-[-3.84px] md:tracking-[-5px] text-white text-center font-pleasure font-bold uppercase"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Rewards
            </p>
            <p
              className="text-[13px] md:text-[16px] leading-[20px] md:leading-[24px] tracking-[-0.26px] md:tracking-[-0.32px] text-[#b5b5b5] text-center font-mono"
              style={{ textShadow: "rgba(255,255,255,0.7) 0px 0px 16px" }}
            >
              Redeem your IRL Points for exclusive perks, discounts, and
              experiences at your favorite venues and events.
            </p>
            <div className="mt-2"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
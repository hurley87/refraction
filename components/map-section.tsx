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
  const videoRef = useRef<HTMLVideoElement>(null);
  const stencilRef = useRef<HTMLDivElement>(null);
  const section1Ref = useRef<HTMLDivElement>(null);
  const section1TextRef = useRef<HTMLDivElement>(null);
  const section2Ref = useRef<HTMLDivElement>(null);
  const section2TextRef = useRef<HTMLDivElement>(null);

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

    // Create main timeline with ScrollTrigger - longer duration for progressive reveals
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top top",
        end: () => `+=${window.innerHeight * 6}`, // 6x longer for 3 sections
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    // Video Section: Stage 1 - Show video, hold for a few seconds
    tl.to({}, { duration: 1 });

    // Video Section: Stage 2 - Fade in stencil overlay
    tl.to(
      stencilRef.current,
      {
        opacity: 1,
        duration: 0.8,
        ease: "power2.inOut",
      },
      "+=0.2",
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
        className="absolute inset-0 flex items-center justify-center bg-[#131313]"
      >
        {/* Video Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden md:rounded-none rounded-[26px]">
            <video
              ref={videoRef}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            >
              <source src="/video-reel.mp4" type="video/mp4" />
            </video>
          </div>
        </div>

        {/* Stencil Overlay */}
        <div
          ref={stencilRef}
          className="absolute inset-0 flex items-center justify-center bg-black"
        >
          <div className="relative w-full h-full flex flex-col items-center justify-center px-8 text-center">
            <h2 className="text-[28px] md:text-[48px] leading-[34px] md:leading-[56px] tracking-[-0.5px] md:tracking-[-1px] text-white font-pleasure font-medium mb-8">
              Earn Rewards For
              <br />
              Showing Up To The
              <br />
              Things You Love.
            </h2>
            <p className="text-[20px] md:text-[32px] leading-[28px] md:leading-[42px] tracking-[-0.4px] md:tracking-[-0.8px] text-white/90 font-pleasure">
              Built By Artists,
              <br />
              Curators, And
              <br />
              Event Organizers.
            </p>
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

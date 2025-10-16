"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Artist CTA component - Call to action for artists to join IRL
 * Matches Figma design: node-id=6192-100628
 */
export default function ArtistCTA() {
  const sectionRef = useRef<HTMLElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;

      const rect = sectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate progress as the section moves through viewport
      // 0 when section top is at bottom of viewport
      // 1 when section bottom is at top of viewport
      const progress = Math.max(
        0,
        Math.min(1, (windowHeight - rect.top) / (windowHeight + rect.height)),
      );

      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Calculate transforms based on scroll progress
  // artists1: starts left-center, moves right
  const artists1Transform = `translateX(${-50 + scrollProgress * 50}%)`;
  // artists2: starts right-aligned, moves left as you scroll
  const artists2Transform = `translateX(${scrollProgress * -50}%)`;

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-[#131313] pt-[500px] pb-24 md:pt-[550px] md:pb-32 overflow-hidden"
    >
      {/* Animated artist name strips */}
      <div className="absolute top-8 left-0 w-full z-0 pointer-events-none space-y-4">
        {/* Row 1 - artists1, left-center to right */}
        <div
          className="transition-transform duration-100 ease-out"
          style={{
            transform: artists1Transform,
            position: "relative",
            left: "50%",
          }}
        >
          <img
            src="/artists1.svg"
            alt="Artist names"
            className="w-auto h-[31px]"
          />
        </div>

        {/* Row 2 - artists2, right to left */}
        <div
          className="transition-transform duration-100 ease-out flex justify-end"
          style={{
            transform: artists2Transform,
          }}
        >
          <img
            src="/artists2.svg"
            alt="Artist names"
            className="w-auto h-[31px]"
          />
        </div>

        {/* Row 3 - artists1, left-center to right */}
        <div
          className="transition-transform duration-100 ease-out"
          style={{
            transform: artists1Transform,
            position: "relative",
            left: "50%",
          }}
        >
          <img
            src="/artists1.svg"
            alt="Artist names"
            className="w-auto h-[31px]"
          />
        </div>

        {/* Row 4 - artists2, right to left */}
        <div
          className="transition-transform duration-100 ease-out flex justify-end"
          style={{
            transform: artists2Transform,
          }}
        >
          <img
            src="/artists2.svg"
            alt="Artist names"
            className="w-auto h-[31px]"
          />
        </div>

        {/* Row 5 - artists1, left-center to right */}
        <div
          className="transition-transform duration-100 ease-out"
          style={{
            transform: artists1Transform,
            position: "relative",
            left: "50%",
          }}
        >
          <img
            src="/artists1.svg"
            alt="Artist names"
            className="w-auto h-[31px]"
          />
        </div>

        {/* Row 6 - artists2, right to left */}
        <div
          className="transition-transform duration-100 ease-out flex justify-end"
          style={{
            transform: artists2Transform,
          }}
        >
          <img
            src="/artists2.svg"
            alt="Artist names"
            className="w-auto h-[31px]"
          />
        </div>

        {/* Row 7 - artists1, left-center to right */}
        <div
          className="transition-transform duration-100 ease-out"
          style={{
            transform: artists1Transform,
            position: "relative",
            left: "50%",
          }}
        >
          <img
            src="/artists1.svg"
            alt="Artist names"
            className="w-auto h-[31px]"
          />
        </div>

        {/* Row 8 - artists2, right to left */}
        <div
          className="transition-transform duration-100 ease-out flex justify-end"
          style={{
            transform: artists2Transform,
          }}
        >
          <img
            src="/artists2.svg"
            alt="Artist names"
            className="w-auto h-[31px]"
          />
        </div>

        {/* Row 9 - artists1, left-center to right */}
        <div
          className="transition-transform duration-100 ease-out"
          style={{
            transform: artists1Transform,
            position: "relative",
            left: "50%",
          }}
        >
          <img
            src="/artists1.svg"
            alt="Artist names"
            className="w-auto h-[31px]"
          />
        </div>

        {/* Row 10 - artists2, right to left */}
        <div
          className="transition-transform duration-100 ease-out flex justify-end"
          style={{
            transform: artists2Transform,
          }}
        >
          <img
            src="/artists2.svg"
            alt="Artist names"
            className="w-auto h-[31px]"
          />
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center px-4">
        {/* Content container */}
        <div className="flex flex-col gap-4 items-center text-center max-w-[900px] w-full">
          {/* Small header */}
          <p className="font-grotesk text-[13px] leading-[20px] text-white tracking-[-0.26px] uppercase">
            Become an Artist
          </p>

          {/* Main heading */}
          <h2 className="font-pleasure font-light text-[32px] leading-[32px] md:text-[64px] md:leading-[64px] tracking-[-2.08px] text-white">
            IRL launched with an alumni network of 2000+ DJs, music and visual
            artists.
          </h2>

          {/* CTA Button */}
          <button className="bg-white flex h-12 items-center justify-between px-4 py-2 rounded-full cursor-pointer hover:bg-[#f5f5f5] transition-colors w-[260px] mt-4">
            <span className="font-pleasure font-medium text-[16px] leading-[16px] text-[#313131] tracking-[-1.28px]">
              Become a Founding Member
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="12"
              viewBox="0 0 18 12"
              fill="none"
              className="shrink-0"
            >
              <path
                d="M12 0C12 0.636 12.5498 1.58571 13.1063 2.38286C13.8218 3.41143 14.6767 4.30886 15.657 4.99371C16.392 5.50714 17.283 6 18 6M18 6C17.283 6 16.3912 6.49286 15.657 7.00629C14.6767 7.692 13.8218 8.58943 13.1063 9.61629C12.5498 10.4143 12 11.3657 12 12M18 6H0"
                stroke="#7D7D7D"
                strokeWidth="1"
              />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

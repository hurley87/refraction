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

  // Generate all artist images (artists1.svg to artists17.svg)
  const artistImages = Array.from({ length: 17 }, (_, i) => i + 1);

  // Calculate transforms based on scroll progress
  // Even rows: starts left-center, moves right
  const leftToRightTransform = `translateX(${-50 + scrollProgress * 50}%)`;
  // Odd rows: starts right-aligned, moves left as you scroll
  const rightToLeftTransform = `translateX(${scrollProgress * -50}%)`;

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-[#131313] pt-[1000px] pb-40 md:pt-[900px] md:pb-40 overflow-hidden min-h-[1600px] md:min-h-[1400px]"
    >
      {/* Animated artist name strips */}
      <div className="absolute top-8 left-0 w-full z-0 pointer-events-none space-y-8 md:space-y-6">
        {artistImages.map((imageNumber, index) => {
          const isEvenRow = index % 2 === 0;
          const transform = isEvenRow
            ? leftToRightTransform
            : rightToLeftTransform;

          return (
            <div
              key={`artist-row-${imageNumber}`}
              className={`transition-transform duration-100 ease-out ${
                isEvenRow ? "" : "flex justify-end"
              }`}
              style={{
                transform: transform,
                position: isEvenRow ? "relative" : "static",
                left: isEvenRow ? "50%" : "auto",
              }}
            >
              <img
                src={`/artists${imageNumber}.svg`}
                alt={`Artist names ${imageNumber}`}
                className="w-auto h-[31px]"
              />
            </div>
          );
        })}
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center px-4 py-20 md:py-16">
        {/* Content container */}
        <div className="flex flex-col gap-6 items-center text-center max-w-[900px] w-full">
          {/* Small header */}
          <p className="font-grotesk text-[13px] leading-[20px] text-white tracking-[-0.26px] uppercase pt-6">
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

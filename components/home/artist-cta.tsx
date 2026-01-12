"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Artist CTA component - Call to action for artists to join IRL
 * Matches Figma design: node-id=6192-100628
 */
export default function ArtistCTA() {
  const sectionRef = useRef<HTMLElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    // Set progress to 1 (fully converged) - no scroll animation on any screen size
    setScrollProgress(1);
  }, []);

  // Generate all artist images (artists1.svg to artists17.svg)
  const artistImages = Array.from({ length: 17 }, (_, i) => i + 1);

  // Calculate transforms based on scroll progress
  // Even rows: starts left, moves to center as you scroll (converges)
  // Use calc to center element (-50% of element width) then offset by viewport width
  // On desktop (scrollProgress = 1), strips should span full width (no transform offset)
  const leftToRightTransform = scrollProgress === 1 
    ? "translateX(-50%)" 
    : `translateX(calc(-50% + ${-25 + scrollProgress * 25}vw))`;
  // Odd rows: starts right, moves to center as you scroll (converges)
  const rightToLeftTransform = scrollProgress === 1
    ? "translateX(-50%)"
    : `translateX(calc(-50% + ${25 - scrollProgress * 25}vw))`;

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-[#131313] pt-[150px] pb-[900px] md:pt-[200px] md:pb-[300px] overflow-visible min-h-[800px] md:min-h-[800px]"
    >
      <div className="relative z-10 flex flex-col items-center justify-center px-4 py-20 md:py-16">
        {/* Content container */}
         {/* Header and heading above animated strips */}
      
        <div className="flex flex-col gap-6 items-center text-center max-w-[900px] w-full">
          {/* Small header */}
          <p className="font-grotesk text-[13px] leading-[20px] text-white tracking-[-0.26px] uppercase pt-6">
            Become an Artist
          </p>

          {/* Main heading */}
          <div className="font-pleasure font-light text-[32px] leading-[32px] md:text-[40px] md:leading-[64px] md:max-w-[927px] tracking-[-2.08px] text-white ">
            IRL launched with an alumni network of 2000+ DJs, music and visual
            artists.
          </div>
        </div>
      </div>
     

      {/* Animated artist name strips */}
      <div className="absolute top-[500px] md:top-[600px] left-0 w-full z-0 pointer-events-none md:space-y-6 overflow-visible">
        {artistImages.map((imageNumber, index) => {
          const isEvenRow = index % 2 === 0;
          const transform = isEvenRow
            ? leftToRightTransform
            : rightToLeftTransform;

          return (
            <div
              key={`artist-row-${imageNumber}`}
              className="transition-transform duration-100 ease-out md:w-full md:left-0"
              style={{
                transform: scrollProgress === 1 ? "none" : transform,
                position: "relative",
                left: scrollProgress === 1 ? "0" : "50%",
              }}
            >
              <img
                src={`/homepage/irl-artists/artists${imageNumber}.svg`}
                alt={`Artist names ${imageNumber}`}
                className="w-auto md:w-full h-[31px] md:h-auto object-contain"
              />
            </div>
          );
        })}
      </div>

      {/* CTA Button - Below artist strips on mobile */}
      <div className="absolute top-[1100px] left-0 w-full z-10 flex flex-col items-center justify-center px-4 pb-20 md:hidden">
        <Link
          href="https://airtable.com/appygGt0rRgfh6qxA/shrkshw6J2OMYuae7"
          target="_blank"
        >
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
        </Link>
      </div>

      {/* CTA Button - Desktop version */}
      <div className="relative z-10 hidden md:flex flex-col items-center justify-center px-4 py-200 mt-[-40px]">
        <Link
          href="https://airtable.com/appygGt0rRgfh6qxA/shrkshw6J2OMYuae7"
          target="_blank"
        >
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
        </Link>
      </div>

      
    </section>
  );
}

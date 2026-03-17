'use client';

import { useEffect, useRef, useState } from 'react';

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
  const leftToRightTransform =
    scrollProgress === 1
      ? 'translateX(-50%)'
      : `translateX(calc(-50% + ${-25 + scrollProgress * 25}vw))`;
  // Odd rows: starts right, moves to center as you scroll (converges)
  const rightToLeftTransform =
    scrollProgress === 1
      ? 'translateX(-50%)'
      : `translateX(calc(-50% + ${25 - scrollProgress * 25}vw))`;

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-[#131313] pt-[40px] pb-[900px] md:pt-[40px] md:pb-[300px] overflow-visible min-h-[800px] md:min-h-[800px]"
    >
      <div className="relative z-10 flex flex-col items-center justify-center px-4 py-6 md:py-8">
        {/* Content container */}
        {/* Header and heading above animated strips */}

        <div className="flex flex-col gap-6 items-center text-center max-w-[900px] w-full">
          {/* Main heading */}
          <div className="font-pleasure font-light text-[32px] leading-[32px] md:text-[40px] md:leading-[64px] md:max-w-[927px] tracking-[-2.08px] text-white ">
            IRL launched with an alumni network of 2000+ DJs, music and visual
            artists.
          </div>
        </div>
      </div>

      {/* Animated artist name strips */}
      <div className="absolute top-[250px] md:top-[250px] left-0 w-full z-0 pointer-events-none md:space-y-6 overflow-visible">
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
                transform: scrollProgress === 1 ? 'none' : transform,
                position: 'relative',
                left: scrollProgress === 1 ? '0' : '50%',
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

    </section>
  );
}

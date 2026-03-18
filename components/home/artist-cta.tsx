'use client';

import { useRef } from 'react';

/**
 * Artist CTA component - Call to action for artists to join IRL
 * Matches Figma design: node-id=6192-100628
 */
export default function ArtistCTA() {
  const sectionRef = useRef<HTMLElement>(null);

  // Generate all artist images (artists1.svg to artists27.svg)
  // Keep this in sync with files in `public/homepage/irl-artists/`.
  const artistImages = Array.from({ length: 27 }, (_, i) => i + 1);

  return (
    <section
      ref={sectionRef}
      className="relative z-[100] w-full bg-[#131313] pt-[40px] pb-[80px] md:pt-[40px] md:pb-[120px] overflow-visible"
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
      {/* Keep in normal flow so the footer cannot overlap/clip the list. */}
      <div className="relative z-[101] w-full pointer-events-none mt-[170px] md:mt-[210px] space-y-0 md:space-y-6 overflow-visible">
        {artistImages.map((imageNumber) => (
          <div key={`artist-row-${imageNumber}`} className="w-full">
            <img
              src={`/homepage/irl-artists/artists${imageNumber}.svg`}
              alt={`Artist names ${imageNumber}`}
              className="w-auto md:w-full h-[31px] md:h-auto object-contain"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

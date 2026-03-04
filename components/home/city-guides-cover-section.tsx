'use client';

import Link from 'next/link';
import Image from 'next/image';

// Cover images - Download from Drive and save to public/homepage/city-guides-covers/
// 1: https://drive.google.com/file/d/1i1HEJVS2H9xizsdcUMDWbZ4T1GzNsDGM/view?usp=sharing
// 2: https://drive.google.com/file/d/1Wuh6qM7tx6JyrSbeCfjCJbxHq3cZjxR9/view?usp=sharing
// 3: https://drive.google.com/file/d/1YykG6f9XKRevY48rtLVqaAANhawNUvwd/view?usp=sharing
const COVER_IMAGES = [
  { src: '/homepage/city-guides-covers/guide-1.jpg', alt: 'City guide cover' },
  { src: '/homepage/city-guides-covers/guide-2.jpg', alt: 'City guide cover' },
  { src: '/homepage/city-guides-covers/guide-3.jpg', alt: 'City guide cover' },
];

// Update with actual Refraction Substack URL
const SUBSTACK_GUIDES_URL = 'https://refraction.substack.com';

/**
 * City Guides Cover Carousel - Featured city guide cover images
 */
export default function CityGuidesCoverSection() {
  return (
    <section className="w-full bg-[#131313] px-4 py-16 md:py-24 overflow-hidden">
      <div className="max-w-[1177px] mx-auto">
        <h2
          className="text-[28px] leading-tight md:text-[40px] tracking-[-0.5px] md:tracking-[-0.8px] text-white font-pleasure font-medium mb-4 text-center"
          style={{ textShadow: 'rgba(255,255,255,0.7) 0px 0px 16px' }}
        >
          City Guides
        </h2>
        <h3 className="text-[20px] md:text-[25px] leading-[28px] md:leading-[32px] tracking-[-0.5px] text-white font-pleasure font-medium mb-6 md:mb-8 text-center">
          Local knowledge, everywhere
        </h3>
        <p className="body-medium text-[13px] leading-[20px] md:text-[15px] md:leading-[24px] tracking-[-0.26px] text-[#b5b5b5] font-grotesk text-center max-w-[700px] mx-auto mb-12 md:mb-16">
          Curated guides from the people who know. Venue operators, DJs, artists
          share their cities. Not listicles. Not algorithms. Just locals who
          know.
        </p>

        {/* Carousel of cover images */}
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:px-0 md:mx-0 scrollbar-hide snap-x snap-mandatory mb-12 md:mb-16">
          {COVER_IMAGES.map((img, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[280px] md:w-[320px] snap-center group"
            >
              <div className="relative aspect-[3/4] rounded-[17px] overflow-hidden bg-[#1a1a1a]">
                <Image
                  src={img.src}
                  alt={`${img.alt} ${i + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="320px"
                />
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={SUBSTACK_GUIDES_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <button className="bg-white flex h-12 items-center justify-center gap-2 px-6 py-2 rounded-full cursor-pointer hover:bg-gray-100 transition-colors">
              <span className="font-pleasure font-medium text-[16px] leading-[16px] text-[#313131] tracking-[-1.28px]">
                Read the Guides
              </span>
              <Image src="/arrow-right.svg" alt="" width={24} height={24} />
            </button>
          </Link>
        
        </div>
      </div>
    </section>
  );
}

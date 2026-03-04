'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// City data - add hero images from Drive to public/homepage/cities/[slug].jpg
// Drive folder: https://drive.google.com/drive/folders/1Vr9Mxieyl_16VeGH5xyGsQ-GamFMzQCl
// Substack URLs - update with actual Refraction Substack city guide links
const CITIES = [
  {
    name: 'Mexico City',
    slug: 'mexico-city',
    guideUrl: 'https://refraction.substack.com/city/mexico-city',
  },
  {
    name: 'London',
    slug: 'london',
    guideUrl: 'https://refraction.substack.com/city/london',
  },
  {
    name: 'Hong Kong',
    slug: 'hong-kong',
    guideUrl: 'https://refraction.substack.com/city/hong-kong',
  },
  {
    name: 'New York',
    slug: 'new-york',
    guideUrl: 'https://refraction.substack.com/city/new-york',
  },
  {
    name: 'Montreal',
    slug: 'montreal',
    guideUrl: 'https://refraction.substack.com/city/montreal',
  },
  {
    name: 'Tokyo',
    slug: 'tokyo',
    guideUrl: 'https://refraction.substack.com/city/tokyo',
  },
  {
    name: 'Berlin',
    slug: 'berlin',
    guideUrl: 'https://refraction.substack.com/city/berlin',
  },
  {
    name: 'Lisbon',
    slug: 'lisbon',
    guideUrl: 'https://refraction.substack.com/city/lisbon',
  },
];

/**
 * City Guides Carousel - Featured venues from local City Guides
 */
export default function CityGuidesCarouselSection() {
  const [userCity, setUserCity] = useState<string | null>(null);

  useEffect(() => {
    // Attempt to get user's city from geolocation (simplified - would need reverse geocoding in production)
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          // Would call reverse geocoding API here - for now use null (shows "Your City")
          setUserCity(null);
        },
        () => setUserCity(null)
      );
    }
  }, []);

  return (
    <section className="w-full bg-[#131313] px-4 py-16 md:py-24 overflow-hidden">
      <div className="max-w-[1177px] mx-auto">
        <h2
          className="text-[28px] leading-tight md:text-[40px] tracking-[-0.5px] md:tracking-[-0.8px] text-white font-pleasure font-medium mb-4 text-center"
          style={{ textShadow: 'rgba(255,255,255,0.7) 0px 0px 16px' }}
        >
          30 Cities, One Network
        </h2>
        <p className="body-medium text-[13px] leading-[20px] md:text-[15px] md:leading-[24px] tracking-[-0.26px] text-[#b5b5b5] font-grotesk text-center max-w-[700px] mx-auto mb-12 md:mb-16">
          Mexico City. London. Hong Kong, NYC. Montreal. Ever-expanding local
          guides in every city showing you where they go.
        </p>

        {/* City cards carousel */}
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:px-0 md:mx-0 scrollbar-hide snap-x snap-mandatory">
          {CITIES.map((city) => (
            <Link
              key={city.slug}
              href={city.guideUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 w-[280px] md:w-[320px] snap-center group"
            >
              <div className="relative aspect-[4/5] rounded-[17px] overflow-hidden bg-[#1a1a1a]">
                <Image
                  src={`/homepage/cities/${city.slug}.jpg`}
                  alt={city.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="320px"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <span className="font-pleasure font-medium text-[20px] leading-[24px] text-white">
                    {city.name}
                  </span>
                  <p className="text-[12px] text-white/80 mt-1">
                    View city guide →
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12 md:mt-16">
          <Link href="/interactive-map">
            <button className="bg-white flex h-12 items-center justify-center gap-2 px-6 py-2 rounded-full cursor-pointer hover:bg-gray-100 transition-colors">
              <span className="font-pleasure font-medium text-[16px] leading-[16px] text-[#313131] tracking-[-1.28px]">
                Explore {userCity ?? 'Your City'}
              </span>
              <Image src="/arrow-right.svg" alt="" width={24} height={24} />
            </button>
          </Link>
          <Link
            href="/interactive-map"
            className="text-white font-grotesk text-[14px] underline hover:no-underline"
          >
            View city guide
          </Link>
        </div>
      </div>
    </section>
  );
}

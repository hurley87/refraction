'use client';

import Image from 'next/image';
import { memo } from 'react';

/**
 * Partner type definition
 */
type Partner = {
  name: string;
  logo: string;
};

/**
 * Featured partners to display in the marquee
 */
const partners: Partner[] = [
  {
    name: 'Resident Advisor',
    logo: '/partner_logos/Resident Advisor white logo.svg',
  },
  { name: 'Aptos', logo: '/partner_logos/Aptos_Primary_WHT.svg' },
  { name: 'Polygon', logo: '/partner_logos/Polygon Primary light.svg' },
  { name: 'Reown', logo: '/partner_logos/reown-logo-negative.svg' },
  { name: 'Zora', logo: '/partner_logos/Zora Logo White.svg' },
  { name: 'Livepeer', logo: '/partner_logos/Livepeer white logo.svg' },
  { name: 'Near', logo: '/partner_logos/Near white logo.svg' },
  { name: 'LUKSO', logo: '/partner_logos/LUKSO_logo white.svg' },
  { name: 'OpenSea', logo: '/partner_logos/Opensea white logo.svg' },
  { name: 'Galxe', logo: '/partner_logos/Galxe_Logo_Wordmark_White.svg' },
  { name: 'Mutek', logo: '/partner_logos/Mutek white logo.svg' },
  { name: 'FWB', logo: '/partner_logos/FWB-Lettermark.svg' },
];

/**
 * Marquee Row Component for infinite scrolling logos
 * Memoized to prevent unnecessary re-renders
 */
const MarqueeRow = memo(function MarqueeRow({
  partners,
  direction = 'left',
  className = '',
}: {
  partners: Partner[];
  direction?: 'left' | 'right';
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden w-full h-20 md:h-16 mb-6 ${className}`}
    >
      <div
        className={`flex items-center gap-8 md:gap-12 absolute whitespace-nowrap [will-change:transform] ${
          direction === 'left' ? 'animate-marquee' : 'animate-marquee-reverse'
        }`}
        style={{
          // Force GPU acceleration
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* Duplicate the array 3 times for seamless loop */}
        {[...partners, ...partners, ...partners].map((partner, index) => (
          <div
            key={`${partner.name}-${index}`}
            className="flex items-center justify-center h-20 md:h-16 min-w-[140px] md:min-w-[120px]"
          >
            <Image
              src={partner.logo}
              alt={`${partner.name} logo`}
              width={160}
              height={80}
              loading="lazy"
              className="max-w-[140px] md:max-w-[120px] max-h-[70px] md:max-h-[64px] object-contain opacity-80 md:opacity-70"
              unoptimized={partner.logo.endsWith('.svg')}
            />
          </div>
        ))}
      </div>
    </div>
  );
});

/**
 * Partners section component with horizontal scrolling marquee
 */
export default function Partners() {
  return (
    <section className="w-full bg-[#131313] py-12 md:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-8">
          <p className="text-[13px] font-grotesk text-white uppercase tracking-[-0.26px] leading-5">
            Trusted By
          </p>
        </div>

        {/* Marquee Rows */}
        <div>
          <MarqueeRow partners={partners} direction="right" />
          <MarqueeRow
            partners={partners}
            direction="left"
            className="md:hidden"
          />
        </div>
      </div>
    </section>
  );
}

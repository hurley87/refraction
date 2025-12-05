"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { memo } from "react";

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
    name: "Resident Advisor",
    logo: "/partner_logos/Resident Advisor white logo.svg",
  },
  { name: "Aptos", logo: "/partner_logos/Aptos_Primary_WHT.svg" },
  { name: "Polygon", logo: "/partner_logos/Polygon Primary light.svg" },
  { name: "Reown", logo: "/partner_logos/reown-logo-negative.svg" },
  { name: "Zora", logo: "/partner_logos/Zora Logo White.svg" },
  { name: "Livepeer", logo: "/partner_logos/Livepeer white logo.svg" },
  { name: "Near", logo: "/partner_logos/Near white logo.svg" },
  { name: "LUKSO", logo: "/partner_logos/LUKSO_logo white.svg" },
  { name: "OpenSea", logo: "/partner_logos/Opensea white logo.svg" },
  { name: "Galxe", logo: "/partner_logos/Galxe_Logo_Wordmark_White.svg" },
  { name: "Mutek", logo: "/partner_logos/Mutek white logo.svg" },
  { name: "FWB", logo: "/partner_logos/FWB-Lettermark.svg" },
];

/**
 * Marquee Row Component for infinite scrolling logos
 * Memoized to prevent unnecessary re-renders
 */
const MarqueeRow = memo(function MarqueeRow({
  partners,
  direction = "left",
}: {
  partners: Partner[];
  direction?: "left" | "right";
}) {
  return (
    <div className="relative overflow-hidden w-full h-20 md:h-16 mb-6">
      <div
        className={`flex items-center gap-8 md:gap-12 absolute whitespace-nowrap [will-change:transform] ${
          direction === "left" ? "animate-marquee" : "animate-marquee-reverse"
        }`}
        style={{
          // Force GPU acceleration
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
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
              unoptimized={partner.logo.endsWith(".svg")}
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
    <section className="w-full bg-[#131313] py-16 md:py-24 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-12">
          <p className="text-[13px] font-grotesk text-white uppercase tracking-[-0.26px] leading-5">
            Trusted By
          </p>
        </div>

        {/* Marquee Rows */}
        <div className="mb-12">
          <MarqueeRow partners={partners.slice(0, 6)} direction="left" />
          <MarqueeRow partners={partners.slice(6)} direction="right" />
        </div>

        {/* Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            href="/partners"
            className="bg-white flex items-center justify-between h-[48px] px-4 py-2 rounded-[100px] cursor-pointer hover:bg-[#b5b5b5] transition-colors group gap-4"
          >
            Become a Partner
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="12"
              viewBox="0 0 18 12"
              fill="none"
              className="block"
            >
              <path
                d="M12 0C12 0.636 12.5498 1.58571 13.1063 2.38286C13.8218 3.41143 14.6767 4.30886 15.657 4.99371C16.392 5.50714 17.283 6 18 6M18 6C17.283 6 16.3912 6.49286 15.657 7.00629C14.6767 7.692 13.8218 8.58943 13.1063 9.61629C12.5498 10.4143 12 11.3657 12 12M18 6H0"
                stroke="#313131"
                strokeWidth="1"
              />
            </svg>
          </Link>
          <Link
            href="/contact-us"
            className="bg-[#313131] flex items-center justify-between h-[48px] px-4 py-2 rounded-[100px] cursor-pointer hover:bg-[#414141] transition-colors group gap-4 text-white"
          >
            Contact Us
            <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
      </div>
    </section>
  );
}

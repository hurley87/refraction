"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
    logo: "/images/partners/Resident Advisor white logo.png",
  },
  { name: "Aptos", logo: "/images/partners/Aptos_Primary_WHT.png" },
  { name: "Polygon", logo: "/images/partners/Polygon Primary light.png" },
  { name: "Reown", logo: "/images/partners/reown-logo.svg" },
  { name: "Zora", logo: "/images/partners/Zora Logo White.png" },
  { name: "Ledger", logo: "/images/partners/LEDGER-WORDMARK-WHITE-RGB.png" },
  { name: "Livepeer", logo: "/images/partners/Livepeer white logo.png" },
  { name: "Near", logo: "/images/partners/Near white logo.png" },
  { name: "LUKSO", logo: "/images/partners/LUKSO_logo white.svg" },
  { name: "OpenSea", logo: "/images/partners/Opensea white logo.png" },
  { name: "Art Blocks", logo: "/images/partners/Art Blocks light logo.png" },
  { name: "Galxe", logo: "/images/partners/Galxe_Logo_Wordmark_White.png" },
];

/**
 * Marquee Row Component for infinite scrolling logos
 */
function MarqueeRow({
  partners,
  direction = "left",
}: {
  partners: Partner[];
  direction?: "left" | "right";
}) {
  return (
    <div className="relative overflow-hidden w-full h-16 mb-6">
      <div
        className={`flex items-center gap-12 absolute whitespace-nowrap ${
          direction === "left" ? "animate-marquee" : "animate-marquee-reverse"
        }`}
      >
        {/* Duplicate the array 3 times for seamless loop */}
        {[...partners, ...partners, ...partners].map((partner, index) => (
          <div
            key={`${partner.name}-${index}`}
            className="flex items-center justify-center h-16 min-w-[120px]"
          >
            <Image
              src={partner.logo}
              alt={`${partner.name} logo`}
              width={120}
              height={64}
              className="max-w-[120px] max-h-[64px] object-contain opacity-70 hover:opacity-100 transition-opacity duration-300"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

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
            href="/contact-us"
            className="inline-flex items-center justify-between gap-2 bg-white text-[#313131] px-4 py-3 rounded-full font-inktrap text-base tracking-[-1.28px] leading-4 hover:bg-white/90 transition-colors duration-300"
          >
            Become a Partner
            <ArrowRight className="w-6 h-6" />
          </Link>
          <Link
            href="/contact-us"
            className="inline-flex items-center justify-between gap-2 bg-[#313131] text-white px-4 py-3 rounded-full font-inktrap text-base tracking-[-1.28px] leading-4 hover:bg-[#414141] transition-colors duration-300"
          >
            Contact Us
            <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
      </div>
    </section>
  );
}

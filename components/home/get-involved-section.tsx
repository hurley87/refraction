'use client';

import Link from 'next/link';
import Image from 'next/image';

// DEV: Link destinations to be provided by Jim/Katie - update these as needed
const PARTNER_URL = 'mailto:partnerships@refractionfestival.com';
const COMMUNITY_URL = 'https://t.me/irlnetwork'; // Telegram - update if Discord preferred

/**
 * Get Involved section - Bring IRL to your city
 */
export default function GetInvolvedSection() {
  return (
    <section className="w-full bg-[#131313] px-4 py-16 md:py-24">
      <div className="max-w-[1177px] mx-auto flex flex-col items-center text-center">
        <h2
          className="text-[28px] leading-tight md:text-[40px] tracking-[-0.5px] md:tracking-[-0.8px] text-white font-pleasure font-medium mb-4"
          style={{ textShadow: 'rgba(255,255,255,0.7) 0px 0px 16px' }}
        >
          Get Involved
        </h2>
        <h3 className="text-[20px] md:text-[25px] leading-[28px] md:leading-[32px] tracking-[-0.5px] text-white font-pleasure font-medium mb-6 md:mb-8">
          Bring IRL to your city
        </h3>
        <p className="body-medium text-[13px] leading-[20px] md:text-[15px] md:leading-[24px] tracking-[-0.26px] text-[#b5b5b5] font-grotesk max-w-[700px] mb-10 md:mb-12">
          Want to host an IRL Tour event? Add your venue to the network? Help
          fund local culture? Join the community building this.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={PARTNER_URL}>
            <button className="bg-white flex h-12 items-center justify-center gap-2 px-6 py-2 rounded-full cursor-pointer hover:bg-gray-100 transition-colors">
              <span className="font-pleasure font-medium text-[16px] leading-[16px] text-[#313131] tracking-[-1.28px]">
                Partner with IRL (for venues)
              </span>
              <Image src="/arrow-right.svg" alt="" width={24} height={24} />
            </button>
          </Link>
          <Link href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer">
            <button className="border border-white flex h-12 items-center justify-center gap-2 px-6 py-2 rounded-full cursor-pointer hover:bg-white/10 transition-colors">
              <span className="font-pleasure font-medium text-[16px] leading-[16px] text-white tracking-[-1.28px]">
                Join the community
              </span>
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}

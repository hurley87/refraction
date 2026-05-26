'use client';

import Image from 'next/image';
import { SponsoredActivationExitBackLink } from '@/components/sponsored-activation/sponsored-activation-exit-back-link';
import { SponsoredActivationHeroReceiveBar } from '@/components/sponsored-activation/sponsored-activation-hero-receive-bar';

type SponsoredActivationHeroProps = {
  heroImageUrl: string | null;
  itemName: string;
};

export function SponsoredActivationHero({
  heroImageUrl,
  itemName,
}: SponsoredActivationHeroProps) {
  return (
    <div className="relative h-[320px] w-full shrink-0 overflow-hidden bg-neutral-100">
      {heroImageUrl ? (
        <Image
          src={heroImageUrl}
          alt={itemName}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 420px"
          priority
          unoptimized
        />
      ) : (
        <div className="flex h-full items-center justify-center px-6 text-center body-medium font-grotesk text-[#757575]">
          {itemName}
        </div>
      )}
      <SponsoredActivationExitBackLink />
      <SponsoredActivationHeroReceiveBar itemName={itemName} />
    </div>
  );
}

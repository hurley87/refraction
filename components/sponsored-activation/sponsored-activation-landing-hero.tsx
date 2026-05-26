'use client';

import Image from 'next/image';
import { SponsoredActivationPointsValue } from '@/components/sponsored-activation/sponsored-activation-points-value';

type SponsoredActivationLandingHeroProps = {
  heroImageUrl: string | null;
  itemName: string;
  pointsCost: number;
  perkValueLabel: string;
};

/**
 * Figma spend activation landing: full-bleed hero with white perk card anchored at bottom.
 */
export function SponsoredActivationLandingHero({
  heroImageUrl,
  itemName,
  pointsCost,
  perkValueLabel,
}: SponsoredActivationLandingHeroProps) {
  return (
    <section className="relative min-h-[470px] w-full overflow-hidden bg-neutral-200">
      {heroImageUrl ? (
        <Image
          src={heroImageUrl}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 420px"
          priority
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 bg-neutral-300" aria-hidden />
      )}

      <div className="absolute inset-x-0 bottom-0 flex justify-center px-4 pb-5 pt-[156px]">
        <div className="w-full max-w-[361px] rounded-sm bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
          <div className="flex items-start justify-between gap-3">
            <h2 className="title4 min-w-0 flex-1 text-[#171717]">{itemName}</h2>
            <SponsoredActivationPointsValue points={pointsCost} />
          </div>
          <p className="label-small mt-2 text-right font-grotesk font-semibold uppercase tracking-wide text-[#a9a9a9]">
            {perkValueLabel}
          </p>
        </div>
      </div>
    </section>
  );
}

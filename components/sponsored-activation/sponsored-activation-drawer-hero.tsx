import Image from 'next/image';
import { SponsoredActivationHeroDetailsCard } from '@/components/sponsored-activation/sponsored-activation-hero-details-card';

type SponsoredActivationDrawerHeroProps = {
  heroImageUrl: string | null;
  itemName: string;
  pointsCost: number;
  perkValueLabel: string;
};

export function SponsoredActivationDrawerHero({
  heroImageUrl,
  itemName,
  pointsCost,
  perkValueLabel,
}: SponsoredActivationDrawerHeroProps) {
  return (
    <div className="relative min-h-0 w-full flex-1 overflow-hidden bg-neutral-200">
      {heroImageUrl ? (
        <Image
          src={heroImageUrl}
          alt=""
          fill
          className="z-0 object-cover"
          sizes="(max-width: 768px) 100vw, 420px"
          priority
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 bg-neutral-300" aria-hidden />
      )}
      <SponsoredActivationHeroDetailsCard
        itemName={itemName}
        pointsCost={pointsCost}
        perkValueLabel={perkValueLabel}
      />
    </div>
  );
}

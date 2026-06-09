import Image from 'next/image';
import { SponsoredActivationHeroNav } from '@/components/sponsored-activation/sponsored-activation-hero-nav';
import { SponsoredActivationHeroDetailsCard } from '@/components/sponsored-activation/sponsored-activation-hero-details-card';

type SponsoredActivationLandingHeroProps = {
  heroImageUrl: string | null;
  itemName: string;
  pointsCost: number;
  perkValueLabel: string;
  /**
   * Details card layout: `purchase` (item + points + USD value) for the
   * logged-out landing, `receive` ("YOU RECEIVE" + item) for the confirm stage.
   */
  detailsVariant?: 'purchase' | 'receive';
};

export function SponsoredActivationLandingHero({
  heroImageUrl,
  itemName,
  pointsCost,
  perkValueLabel,
  detailsVariant = 'purchase',
}: SponsoredActivationLandingHeroProps) {
  return (
    <section className="relative left-1/2 min-h-[470px] w-screen -translate-x-1/2 overflow-hidden bg-neutral-200 md:left-auto md:w-full md:translate-x-0">
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

      <SponsoredActivationHeroNav />
      <SponsoredActivationHeroDetailsCard
        variant={detailsVariant}
        itemName={itemName}
        pointsCost={pointsCost}
        perkValueLabel={perkValueLabel}
      />
    </section>
  );
}

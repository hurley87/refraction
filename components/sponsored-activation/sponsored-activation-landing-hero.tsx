import Image from 'next/image';
import { SponsoredActivationExitBackLink } from '@/components/sponsored-activation/sponsored-activation-exit-back-link';
import { SponsoredActivationHeroReceiveBar } from '@/components/sponsored-activation/sponsored-activation-hero-receive-bar';

type SponsoredActivationLandingHeroProps = {
  heroImageUrl: string | null;
  itemName: string;
};

export function SponsoredActivationLandingHero({
  heroImageUrl,
  itemName,
}: SponsoredActivationLandingHeroProps) {
  return (
    <section className="relative min-h-[470px] w-full overflow-hidden bg-neutral-200">
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

      <SponsoredActivationExitBackLink />
      <SponsoredActivationHeroReceiveBar itemName={itemName} />
    </section>
  );
}

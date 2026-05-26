import Image from 'next/image';
import { SponsoredActivationHeroReceiveBar } from '@/components/sponsored-activation/sponsored-activation-hero-receive-bar';

type SponsoredActivationDrawerHeroProps = {
  heroImageUrl: string | null;
  itemName: string;
};

export function SponsoredActivationDrawerHero({
  heroImageUrl,
  itemName,
}: SponsoredActivationDrawerHeroProps) {
  return (
    <div className="relative -mx-4 h-[320px] w-[calc(100%+2rem)] overflow-hidden bg-neutral-100">
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
        <div className="absolute inset-0 bg-neutral-200" aria-hidden />
      )}
      <SponsoredActivationHeroReceiveBar itemName={itemName} className="px-8" />
    </div>
  );
}

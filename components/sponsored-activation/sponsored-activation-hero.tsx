import Image from 'next/image';
import { SponsoredActivationHeroNav } from '@/components/sponsored-activation/sponsored-activation-hero-nav';
import { SponsoredActivationHeroDetailsCard } from '@/components/sponsored-activation/sponsored-activation-hero-details-card';

type SponsoredActivationHeroProps = {
  heroImageUrl: string | null;
  itemName: string;
  /** Redeemed state: overlays a yellow wash + white checkmark on the image. */
  redeemed?: boolean;
};

export function SponsoredActivationHero({
  heroImageUrl,
  itemName,
  redeemed = false,
}: SponsoredActivationHeroProps) {
  return (
    <div className="relative left-1/2 h-[320px] w-screen -translate-x-1/2 shrink-0 overflow-hidden bg-neutral-100 md:left-auto md:w-full md:translate-x-0">
      {heroImageUrl ? (
        <Image
          src={heroImageUrl}
          alt={itemName}
          fill
          className="z-0 object-cover"
          sizes="(max-width: 768px) 100vw, 420px"
          priority
          unoptimized
        />
      ) : (
        <div className="flex h-full items-center justify-center px-6 text-center body-medium font-grotesk text-[#757575]">
          {itemName}
        </div>
      )}

      {redeemed && (
        <>
          <div
            aria-hidden
            className="absolute inset-0 z-[1] bg-[var(--Backgrounds-Highlight,#FFF200)] opacity-60"
          />
          <div
            aria-hidden
            className="absolute inset-0 z-[2] flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="162"
              height="162"
              viewBox="0 0 162 162"
              fill="none"
              className="aspect-square"
            >
              <path
                d="M111.229 20.25L68.6177 114.563L49.7055 74.46L19.6172 74.2863L50.1606 135H59.644H80.4673H89.532L141.117 20.25H111.229Z"
                fill="white"
              />
            </svg>
          </div>
        </>
      )}

      <SponsoredActivationHeroNav showBack={redeemed} />
      <SponsoredActivationHeroDetailsCard itemName={itemName} />
    </div>
  );
}

import Image from 'next/image';

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
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 420px"
          priority
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 bg-neutral-200" aria-hidden />
      )}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between gap-3 bg-white px-4 py-4"
        role="group"
        aria-label="You receive"
      >
        <span className="label-small font-grotesk uppercase tracking-wide text-[#757575]">
          You receive
        </span>
        <span className="label-small max-w-[55%] truncate text-right font-grotesk font-semibold uppercase tracking-wide text-[#171717]">
          {itemName}
        </span>
      </div>
    </div>
  );
}

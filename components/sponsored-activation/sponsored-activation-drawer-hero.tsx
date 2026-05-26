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
    <div className="relative -mx-4 h-[323px] w-[calc(100%+2rem)] overflow-hidden bg-neutral-100">
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
        className="absolute inset-x-4 bottom-0 flex items-center justify-between gap-3 border-t border-[#454545]/20 bg-white px-2 py-2"
        role="group"
        aria-label="You receive"
      >
        <span className="label-small font-grotesk font-bold uppercase tracking-wide text-[#757575]">
          You receive
        </span>
        <span className="title5 max-w-[60%] truncate text-right font-grotesk font-semibold text-[#171717]">
          {itemName}
        </span>
      </div>
    </div>
  );
}

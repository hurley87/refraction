import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SPONSORED_ACTIVATION_EXIT_URL } from '@/lib/sponsored-activation/exit-url';

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
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 420px"
          priority
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 bg-neutral-300" aria-hidden />
      )}

      <Link
        href={SPONSORED_ACTIVATION_EXIT_URL}
        className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex size-10 items-center justify-center rounded-full bg-white shadow-sm transition-opacity hover:opacity-90"
        aria-label="Back to IRL"
      >
        <ArrowLeft className="size-5 text-[#171717]" strokeWidth={2} />
      </Link>

      <div
        className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 bg-white px-4 py-4"
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
    </section>
  );
}

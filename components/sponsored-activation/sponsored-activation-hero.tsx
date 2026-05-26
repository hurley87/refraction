'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

type SponsoredActivationHeroProps = {
  heroImageUrl: string | null;
  itemName: string;
};

export function SponsoredActivationHero({
  heroImageUrl,
  itemName,
}: SponsoredActivationHeroProps) {
  const router = useRouter();

  return (
    <div className="relative w-full">
      <div className="relative h-[320px] w-full overflow-hidden bg-neutral-100">
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
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute left-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-white shadow-sm transition-opacity hover:opacity-90"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5 text-[#171717]" strokeWidth={2} />
        </button>
        <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between gap-3 bg-white px-4 py-4">
          <span className="label-small font-grotesk uppercase tracking-wide text-[#757575]">
            You receive
          </span>
          <span className="label-small max-w-[55%] truncate text-right font-grotesk font-semibold uppercase tracking-wide text-[#171717]">
            {itemName}
          </span>
        </div>
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Hero image height — half of a 640px mobile viewport per Figma. */
export const SPONSORED_ACTIVATION_HERO_HEIGHT_PX = 320;

type SponsoredActivationHeroProps = {
  heroImageUrl: string | null;
  itemName: string;
  className?: string;
};

export function SponsoredActivationHero({
  heroImageUrl,
  itemName,
  className,
}: SponsoredActivationHeroProps) {
  const router = useRouter();

  return (
    <div className={cn('relative w-full', className)}>
      <div
        className="relative w-full overflow-hidden bg-neutral-100"
        style={{ height: SPONSORED_ACTIVATION_HERO_HEIGHT_PX }}
      >
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

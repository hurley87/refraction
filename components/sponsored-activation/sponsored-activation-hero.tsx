'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100">
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
          <div className="flex h-full min-h-[240px] items-center justify-center px-6 text-center body-medium font-grotesk text-[#757575]">
            {itemName}
          </div>
        )}
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute left-4 top-4 flex size-10 items-center justify-center rounded-full bg-white shadow-sm transition-opacity hover:opacity-90"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5 text-[#171717]" strokeWidth={2} />
        </button>
      </div>
      <div className="flex items-center justify-between gap-3 border-y border-[#171717]/10 bg-white px-4 py-4">
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

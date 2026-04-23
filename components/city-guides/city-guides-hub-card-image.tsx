import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface CityGuidesHubCardImageProps {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}

/**
 * Shared image rail for city-guides hub: 361px column, 24px vertical padding (`py-6`),
 * 16px gap (`gap-4`), column + centered. Image uses `object-contain` inside a fixed
 * height frame so the full asset is visible (letterboxing on neutral-200 when aspect ratios differ).
 */
export function CityGuidesHubCardImage({
  src,
  alt,
  priority = false,
  className,
}: CityGuidesHubCardImageProps) {
  return (
    <div
      className={cn(
        'mx-auto flex w-[361px] max-w-full flex-col items-center gap-4 py-6',
        className
      )}
    >
      <div className="relative h-[192.533px] w-full shrink-0 overflow-hidden bg-neutral-200">
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          className="object-contain"
          sizes="361px"
        />
      </div>
    </div>
  );
}

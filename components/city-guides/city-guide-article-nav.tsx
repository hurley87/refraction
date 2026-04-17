'use client';

import Image from 'next/image';
import Link from 'next/link';

import MapNav from '@/components/map/mapnav';

const DEFAULT_BACK_HREF = '/city-guides';

export interface CityGuideArticleNavProps {
  /** Defaults to the city guides home (menu). */
  backHref?: string;
  /** Merged onto the underlying `MapNav` row. */
  className?: string;
}

/**
 * City guide article top bar: back to guides list + standard hamburger / `NavigationMenu`.
 * Back control matches design: 48×48, pill border, map-style shadow, `arrow-left.svg`.
 */
export function CityGuideArticleNav({
  backHref = DEFAULT_BACK_HREF,
  className,
}: CityGuideArticleNavProps) {
  return (
    <MapNav
      className={className}
      leftSlot={
        <Link
          href={backHref}
          className="flex h-12 w-12 shrink-0 items-center justify-center gap-4 rounded-[179px] border border-[var(--Dark-Tint-20---Light-Steel,#DBDBDB)] bg-[var(--Dark-Tint-White,#FFF)] p-2 shadow-[0_4px_16px_0_rgba(0,0,0,0.25)] backdrop-blur-[232px] transition-opacity hover:opacity-90"
          aria-label="Back to city guides"
        >
          <Image
            src="/arrow-left.svg"
            alt=""
            width={24}
            height={24}
            className="block shrink-0"
            unoptimized
          />
        </Link>
      }
    />
  );
}

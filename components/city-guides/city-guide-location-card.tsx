import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/lib/utils';

export interface CityGuideLocationCardProps {
  name: string;
  description: string;
  imageSrc: string | null;
  imageAlt: string;
  contributorName: string;
  mapHref: string;
  /** When true, draws the section divider under this card (e.g. before a footer CTA). */
  isLast?: boolean;
}

/**
 * Single venue row for a city guide article (image, title, blurb, credit, map link).
 */
export function CityGuideLocationCard({
  name,
  description,
  imageSrc,
  imageAlt,
  contributorName,
  mapHref,
  isLast = false,
}: CityGuideLocationCardProps) {
  return (
    <section
      className={cn(
        'box-border flex min-h-[617px] w-full max-w-[361px] shrink-0 flex-col gap-4 border-t border-[var(--Borders-Light-Border,#DBDBDB)] pb-6 pt-6 opacity-100',
        isLast && 'border-b border-[var(--Borders-Light-Border,#DBDBDB)]'
      )}
      aria-label={`Location: ${name}`}
    >
      <div className="relative h-[345px] w-full max-w-[361px] shrink-0 overflow-hidden bg-neutral-200">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-cover object-center"
            sizes="361px"
          />
        ) : null}
      </div>

      <div className="flex w-full max-w-[361px] flex-col gap-4 pb-2 opacity-100">
        <h3 className="title2 flex h-8 w-full shrink-0 items-center text-[#171717]">
          {name}
        </h3>
        <p className="body-medium min-h-[88px] w-full text-[#757575]">
          {description}
        </p>
        <div className="flex h-5 w-full max-w-[361px] shrink-0 items-center justify-between gap-2 opacity-100">
          <div className="flex min-w-0 flex-1 items-center gap-1 py-0.5 pl-1 pr-1">
            <Image
              src="/city-guides/user-icon.svg"
              alt=""
              width={12}
              height={12}
              className="size-3 shrink-0"
            />
            <span className="min-w-0 truncate label-small leading-none text-[#171717]">
              {contributorName}
            </span>
          </div>
          <Link
            href={mapHref}
            className="label-medium flex w-[127px] shrink-0 items-center justify-end gap-2 border-b border-[var(--Borders-Light-Border,#DBDBDB)] pb-px uppercase tracking-wide text-[#313131]"
          >
            <span>View on map</span>
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="size-4 shrink-0"
              aria-hidden
            >
              <path
                d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                fill="currentColor"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

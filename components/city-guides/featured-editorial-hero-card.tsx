import Image from 'next/image';
import Link from 'next/link';
import MapNav from '@/components/map/mapnav';
import { cn } from '@/lib/utils';

export type GuideKind = 'city-guide' | 'editorial';

export interface FeaturedEditorialHeroCardProps {
  /** Static for now; later from CMS */
  guideKind: GuideKind;
  titleLine1: string;
  titleLine2: string;
  featuredPeople: string[];
  heroImageSrc: string;
  heroImageAlt: string;
  readHref: string;
  readLabel?: string;
  className?: string;
}

export function guideKindLabel(kind: GuideKind): string {
  return kind === 'city-guide' ? 'City Guide' : 'Editorial';
}

export function defaultReadLabel(kind: GuideKind): string {
  return kind === 'city-guide' ? 'Read guide' : 'Read editorial';
}

/**
 * Featured editorial / city guide hero — mobile-first (393×705); same layout on desktop until a desktop spec exists.
 */
export default function FeaturedEditorialHeroCard({
  guideKind,
  titleLine1,
  titleLine2,
  featuredPeople,
  heroImageSrc,
  heroImageAlt,
  readHref,
  readLabel,
  className,
}: FeaturedEditorialHeroCardProps) {
  const resolvedReadLabel = readLabel ?? defaultReadLabel(guideKind);

  return (
    <section
      className={cn(
        'relative mx-auto h-[705px] w-full max-w-[393px] overflow-hidden bg-neutral-900',
        className
      )}
      aria-labelledby="featured-guide-title"
    >
      <div className="absolute left-0 right-0 top-0 z-20 mx-auto w-full max-w-[393px]">
        <MapNav
          irlLogoVariant="light"
          className="w-full max-w-full min-w-0 bg-transparent px-4 pt-2"
        />
      </div>

      {/* Hero image: 475×705, left -41px (design: justify-between + pb 114px — full-bleed image in card) */}
      <div className="pointer-events-none absolute left-[-41px] top-0 h-[705px] w-[475px]">
        <Image
          src={heroImageSrc}
          alt={heroImageAlt}
          fill
          priority
          className="object-cover object-right-bottom"
          sizes="475px"
        />
      </div>

      {/* Info panel: 361×264 @ top 425px, left 16px */}
      <div
        className="absolute left-4 top-[425px] z-10 flex h-[264px] w-[361px] max-w-[calc(100%-2rem)] flex-col gap-2 bg-white p-4"
        aria-label="Featured guide summary"
      >
        <div
          className="flex h-5 w-fit min-w-[82px] shrink-0 items-center gap-1 py-0.5 pl-1 pr-2.5"
          style={{
            border: '1px solid var(--Borders-Heavy-Border, #454545)',
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-3 shrink-0 text-[#171717]"
            aria-hidden
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <circle cx="12" cy="9" r="2.25" fill="white" />
          </svg>
          <span className="min-w-0 flex-1 whitespace-nowrap label-small uppercase leading-none tracking-wide text-[#171717]">
            {guideKindLabel(guideKind)}
          </span>
        </div>

        <div id="featured-guide-title" className="flex flex-col gap-0.5">
          <h4 className=" font-semibold leading-tight text-[#171717]">
            {titleLine1}
          </h4>
          <span className="display1 font-bold uppercase leading-none tracking-tight text-[#171717]">
            {titleLine2}
          </span>
        </div>

        <p className="label-small uppercase tracking-wide text-[#757575]">
          Featuring
        </p>
        <ul className="flex min-h-0 flex-1 list-none flex-row flex-wrap content-start items-center gap-2">
          {featuredPeople.map((name, index) => (
            <li
              key={`${name}-${index}`}
              className="flex h-5 w-fit min-w-0 max-w-full shrink-0 items-center gap-1 py-0.5 pl-1 pr-1"
              style={{
                border: '1px solid var(--Borders-Heavy-Border, #454545)',
              }}
            >
              <Image
                src="/city-guides/user-icon.svg"
                alt=""
                width={12}
                height={12}
                className="size-3 shrink-0"
              />
              <span className="min-w-0  label-small leading-none text-[#171717]">
                {name}
              </span>
            </li>
          ))}
        </ul>

        <div className="shrink-0 pt-1">
          <Link
            href={readHref}
            className="flex h-8 w-full flex-[1_0_0] items-center justify-between bg-[var(--Dark-Tint-100---Ink-Black,#171717)] px-2 py-1 transition-colors hover:bg-black"
          >
            <span className="label-large uppercase text-white">
              {resolvedReadLabel}
            </span>
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="size-6 shrink-0"
              aria-hidden
            >
              <path
                d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                fill="#ffffff"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

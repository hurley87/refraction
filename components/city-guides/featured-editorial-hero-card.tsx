import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CityGuideArticleMetaRow } from '@/components/city-guides/city-guide-article-meta-row';
import { EDITORIAL_HERO_ASPECT_CLASS } from '@/components/city-guides/city-guide-article-hero-image';
import { EditorialArticleMetaRow } from '@/components/city-guides/editorial-article-meta-row';
import { GuideArticleHighlightedTitle } from '@/components/city-guides/guide-article-highlighted-title';

export type GuideKind = 'city-guide' | 'editorial';

export interface FeaturedEditorialHeroCardProps {
  /** Static for now; later from CMS */
  guideKind: GuideKind;
  titleLine1: string;
  titleHighlightWords?: string[] | null;
  featuredPeople: string[];
  heroImageSrc: string;
  heroImageAlt: string;
  readHref: string;
  readLabel?: string;
  /** Canonical city tag (city name or 'Global'). */
  city?: string;
  className?: string;
}

export function guideKindLabel(kind: GuideKind): string {
  return kind === 'city-guide' ? 'City Guide' : 'Editorial';
}

export function defaultReadLabel(kind: GuideKind): string {
  return kind === 'city-guide' ? 'Read guide' : 'Read editorial';
}

/**
 * Featured editorial / city guide — editorial hero 1350×1080; city guide square on mobile;
 * 393px column on desktop. Summary and list use 16px gutters.
 */
export default function FeaturedEditorialHeroCard({
  guideKind,
  titleLine1,
  titleHighlightWords,
  featuredPeople,
  heroImageSrc,
  readHref,
  readLabel,
  city,
  className,
}: FeaturedEditorialHeroCardProps) {
  const resolvedReadLabel = readLabel ?? defaultReadLabel(guideKind);

  const ariaFeaturedTitle = titleLine1.trim() || resolvedReadLabel;
  const cityTag = city?.trim() ?? '';

  return (
    <section
      className={cn('w-full overflow-hidden bg-white', className)}
      aria-labelledby="featured-guide-title"
    >
      <div
        className={cn(
          'relative mx-auto w-full max-w-none shrink-0 overflow-hidden md:max-w-[393px]',
          guideKind === 'editorial'
            ? EDITORIAL_HERO_ASPECT_CLASS
            : 'aspect-square'
        )}
      >
        <Link
          href={readHref}
          className="absolute inset-0 z-[1] block bg-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-400"
          aria-label={`${resolvedReadLabel}: ${ariaFeaturedTitle}`}
        >
          <Image
            src={heroImageSrc}
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="(max-width: 767px) 100vw, 393px"
          />
        </Link>
      </div>

      <div className="mx-auto w-full max-w-[393px] bg-white px-4 pt-4 pb-10">
        <div
          className="flex w-full flex-col gap-2 bg-white"
          aria-label="Featured guide summary"
        >
          {cityTag ? (
            <div
              className="flex h-5 w-fit min-w-0 items-center gap-1 py-0.5 pl-1 pr-2.5"
              style={{
                border: '1px solid var(--Borders-Heavy-Border, #454545)',
              }}
            >
              <MapPin className="size-3 shrink-0 text-[#171717]" aria-hidden />
              <span className="min-w-0 truncate label-small uppercase leading-none tracking-wide text-[#171717]">
                {cityTag}
              </span>
            </div>
          ) : null}

          <div id="featured-guide-title">
            <Link
              href={readHref}
              aria-label={`${resolvedReadLabel}: ${ariaFeaturedTitle}`}
              className="block transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              <GuideArticleHighlightedTitle
                title={titleLine1}
                highlightWords={titleHighlightWords}
                className="w-full"
                titleClassName="title1 font-bold uppercase tracking-tight text-[#171717] md:leading-none"
              />
            </Link>
          </div>

          {guideKind === 'editorial' ? (
            <EditorialArticleMetaRow
              contributors={featuredPeople}
              creditLabel="WORDS BY"
              className="w-full max-w-none"
            />
          ) : (
            <CityGuideArticleMetaRow
              guideKind={guideKind}
              contributors={featuredPeople}
              creditLabel="WORDS BY"
              className="w-full max-w-none"
            />
          )}

          <div className="shrink-0 pt-1">
            <Link
              href={readHref}
              className="flex h-11 w-full flex-[1_0_0] items-center justify-between bg-[var(--Dark-Tint-100---Ink-Black,#171717)] px-2 py-1 transition-colors hover:bg-black"
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
      </div>
    </section>
  );
}

import { cn } from '@/lib/utils';

export interface CityGuideArticleTitleProps {
  /** e.g. `"The IRL Guide to"` — a space before the city is rendered after this string. */
  titlePrefix: string;
  /** City name shown with rewards-page yellow highlight (`#FFE600`). */
  cityName: string;
  /** When length is 1, renders `w/ …` on the second line (title1 size, medium weight). */
  contributors?: string[];
  className?: string;
}

/**
 * City guide article hero title: 42px bold line (Gal Gothic Variable; −3% tracking)
 * with highlighted city; optional single-contributor credit in title1/medium.
 */
export function CityGuideArticleTitle({
  titlePrefix,
  cityName,
  contributors = [],
  className,
}: CityGuideArticleTitleProps) {
  const singleContributor = contributors.length === 1 ? contributors[0] : null;

  return (
    <div className={cn('w-full max-w-[361px]', className)}>
      <h1 className="font-['Gal_Gothic_Variable',sans-serif] text-[42px] font-bold leading-[40px] tracking-[-0.03em] text-[#313131]">
        <span>{titlePrefix.trimEnd()} </span>
        <span className="box-decoration-clone bg-[#FFE600] px-1 py-0">
          {cityName}
        </span>
      </h1>

      {singleContributor ? (
        <p className="mt-2 font-['Gal_Gothic_Variable',sans-serif] text-[1.9375rem] font-medium leading-8 tracking-[-0.08em] text-[#313131]">
          w/ {singleContributor}
        </p>
      ) : null}
    </div>
  );
}

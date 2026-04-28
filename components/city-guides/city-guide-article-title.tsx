import { cn } from '@/lib/utils';

export interface CityGuideArticleTitleProps {
  /** Full headline shown as one cohesive line (legacy rows merge prefix + city via `cityGuideDisplayTitle`). */
  title: string;
  /** When length is 1, renders `w/ …` on the second line (title1 size, medium weight). */
  contributors?: string[];
  className?: string;
}

/**
 * City guide article hero title: 42px bold line (Gal Gothic Variable; −3% tracking);
 * optional single-contributor credit in title1/medium.
 */
export function CityGuideArticleTitle({
  title,
  contributors = [],
  className,
}: CityGuideArticleTitleProps) {
  const singleContributor = contributors.length === 1 ? contributors[0] : null;

  return (
    <div className={cn('w-full max-w-[361px]', className)}>
      <div className="title2 text-[#313131]">{title}</div>

      {singleContributor ? (
        <p className="mt-2 font-['Gal_Gothic_Variable',sans-serif] text-[1.9375rem] font-medium leading-8 tracking-[-0.08em] text-[#313131]">
          w/ {singleContributor}
        </p>
      ) : null}
    </div>
  );
}

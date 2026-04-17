import { cn } from '@/lib/utils';

export interface CityGuideArticleDescriptionProps {
  /** First item renders as Title4 semibold; remaining items as Body Medium. All `#171717`. */
  paragraphs: string[];
  className?: string;
}

/**
 * Lead copy after the hero: first paragraph Title4 semibold, rest Body Medium.
 */
export function CityGuideArticleDescription({
  paragraphs,
  className,
}: CityGuideArticleDescriptionProps) {
  if (paragraphs.length === 0) return null;

  return (
    <div className={cn('flex w-full max-w-[361px] flex-col gap-4', className)}>
      {paragraphs.map((text, i) => (
        <p
          key={`${i}-${text.slice(0, 24)}`}
          className={
            i === 0
              ? 'title4 font-semibold text-[#171717]'
              : 'body-medium text-[#171717]'
          }
        >
          {text}
        </p>
      ))}
    </div>
  );
}

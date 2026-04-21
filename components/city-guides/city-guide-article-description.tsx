import { cn } from '@/lib/utils';

export interface CityGuideArticleDescriptionProps {
  /** Title4 bold; `#171717`. */
  headline?: string;
  /** Body Medium; each non-empty entry is its own `<p>`, `#171717`. */
  paragraphs?: string[];
  className?: string;
}

function normalizedBodyParagraphs(paragraphs?: string[]): string[] {
  if (!paragraphs?.length) return [];
  return paragraphs.map((p) => p.trim()).filter(Boolean);
}

/**
 * Lead copy after the hero: headline in Title4 bold, supporting copy in Body Medium.
 */
export function CityGuideArticleDescription({
  headline,
  paragraphs,
  className,
}: CityGuideArticleDescriptionProps) {
  const head = headline?.trim() ?? '';
  const bodies = normalizedBodyParagraphs(paragraphs);
  if (!head && bodies.length === 0) return null;

  return (
    <div className={cn('flex w-full max-w-[361px] flex-col gap-4', className)}>
      {head ? <p className="title4 font-bold text-[#171717]">{head}</p> : null}
      {bodies.map((text, i) => (
        <p
          key={`${i}-${text.slice(0, 24)}`}
          className="body-medium text-[#171717]"
        >
          {text}
        </p>
      ))}
    </div>
  );
}

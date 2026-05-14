import { cn } from '@/lib/utils';
import { buildTitleHighlightSegments } from '@/lib/guides/title-highlights';

const HIGHLIGHT_CLASS =
  'box-decoration-clone bg-[var(--IRL-Yellow,#FFF200)] px-1 py-0 text-[#171717]';

export interface GuideArticleHighlightedTitleProps {
  title: string;
  highlightWords?: string[] | null;
  className?: string;
  titleClassName?: string;
  as?: 'h1' | 'div' | 'h2';
  bold?: boolean;
  highlightClassName?: string;
}

/**
 * Renders a guide/editorial headline with IRL yellow on admin-selected phrases
 * (or the last word when none are configured).
 */
export function GuideArticleHighlightedTitle({
  title,
  highlightWords,
  className,
  titleClassName = 'title1 text-[#313131]',
  as: Tag = 'div',
  bold = false,
  highlightClassName = HIGHLIGHT_CLASS,
}: GuideArticleHighlightedTitleProps) {
  const segments = buildTitleHighlightSegments(title, highlightWords);
  if (segments.length === 0) return null;

  return (
    <div className={cn('w-full max-w-[361px]', className)}>
      <Tag className={cn(titleClassName, bold && 'font-bold')}>
        {segments.map((segment, index) =>
          segment.highlight ? (
            <span
              key={`${index}-${segment.text}`}
              className={highlightClassName}
            >
              {segment.text}
            </span>
          ) : (
            <span key={`${index}-${segment.text}`}>{segment.text}</span>
          )
        )}
      </Tag>
    </div>
  );
}

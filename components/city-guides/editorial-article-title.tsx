import { GuideArticleHighlightedTitle } from '@/components/city-guides/guide-article-highlighted-title';

export interface EditorialArticleTitleProps {
  /** Headline — `title1` scale; CMS-selected phrases on IRL yellow. */
  primary: string;
  highlightWords?: string[] | null;
  className?: string;
}

/**
 * Editorial article hero title: single `title1` line with CMS highlight phrases.
 */
export function EditorialArticleTitle({
  primary,
  highlightWords,
  className,
}: EditorialArticleTitleProps) {
  return (
    <GuideArticleHighlightedTitle
      title={primary}
      highlightWords={highlightWords}
      className={className}
      as="h1"
      bold
    />
  );
}

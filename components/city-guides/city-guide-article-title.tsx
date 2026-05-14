import { GuideArticleHighlightedTitle } from '@/components/city-guides/guide-article-highlighted-title';

export interface CityGuideArticleTitleProps {
  /** Full headline (e.g. prefix + city via `cityGuideDisplayTitle`). */
  title: string;
  highlightWords?: string[] | null;
  className?: string;
}

/**
 * City guide article hero title: title1 (42px Gal Gothic); highlighted phrases from CMS.
 */
export function CityGuideArticleTitle({
  title,
  highlightWords,
  className,
}: CityGuideArticleTitleProps) {
  return (
    <GuideArticleHighlightedTitle
      title={title}
      highlightWords={highlightWords}
      className={className}
    />
  );
}

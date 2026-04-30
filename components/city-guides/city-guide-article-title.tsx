import { cn, splitTitleLastWord } from '@/lib/utils';

export interface CityGuideArticleTitleProps {
  /** Full headline (e.g. prefix + city via `cityGuideDisplayTitle`). */
  title: string;
  className?: string;
}

/**
 * City guide article hero title: title1 (42px Gal Gothic); last word on IRL yellow highlight.
 */
export function CityGuideArticleTitle({
  title,
  className,
}: CityGuideArticleTitleProps) {
  const { beforeLastWord, lastWord } = splitTitleLastWord(title);

  return (
    <div className={cn('w-full max-w-[361px]', className)}>
      <div className="title1 text-[#313131]">
        {beforeLastWord ? `${beforeLastWord} ` : null}
        {lastWord ? (
          <span className="box-decoration-clone bg-[#FFF200] px-1 py-0 text-[#171717]">
            {lastWord}
          </span>
        ) : null}
      </div>
    </div>
  );
}

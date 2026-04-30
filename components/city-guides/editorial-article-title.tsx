import { cn, splitTitleLastWord } from '@/lib/utils';

export interface EditorialArticleTitleProps {
  /** Headline — `title1` scale; last word on IRL yellow (same pattern as city guides). */
  primary: string;
  className?: string;
}

/**
 * Editorial article hero title: single `title1` line; last word highlighted.
 */
export function EditorialArticleTitle({
  primary,
  className,
}: EditorialArticleTitleProps) {
  const title = primary.trim();
  const { beforeLastWord, lastWord } = splitTitleLastWord(title);

  return (
    <div className={cn('w-full max-w-[361px]', className)}>
      <h1 className="title1 font-bold text-[#313131]">
        {beforeLastWord ? `${beforeLastWord} ` : null}
        {lastWord ? (
          <span className="box-decoration-clone bg-[#FFF200] px-1 py-0 text-[#171717]">
            {lastWord}
          </span>
        ) : null}
      </h1>
    </div>
  );
}

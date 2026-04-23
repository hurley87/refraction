import { cn } from '@/lib/utils';

export interface EditorialArticleTitleProps {
  /** First line — `title1`, bold (700). Usually a short phrase (a few words). */
  primary: string;
  /** Second line — same `title1` scale, medium (500). Last word gets `#FFE600` highlight like city guides. */
  secondary?: string;
  className?: string;
}

/**
 * Editorial article hero title: one or two lines in the `title1` scale; primary bold;
 * optional secondary line medium with the last word highlighted (same IRL yellow as `CityGuideArticleTitle`).
 */
export function EditorialArticleTitle({
  primary,
  secondary,
  className,
}: EditorialArticleTitleProps) {
  const sub = secondary?.trim() ?? '';
  const secondaryWords = sub ? sub.split(/\s+/).filter(Boolean) : [];
  const secondaryLast = secondaryWords.length
    ? secondaryWords[secondaryWords.length - 1]!
    : '';
  const secondaryBeforeLast =
    secondaryWords.length > 1 ? secondaryWords.slice(0, -1).join(' ') : '';

  return (
    <div className={cn('w-full max-w-[361px]', className)}>
      <h1 className="flex flex-col gap-2 text-[#313131]">
        <span className="title1 font-boldblock">{primary.trim()}</span>
        {sub ? (
          <span className="title1 block font-medium">
            {secondaryBeforeLast ? `${secondaryBeforeLast} ` : null}
            <span className="box-decoration-clone bg-[#FFE600] px-1 py-0">
              {secondaryLast}
            </span>
          </span>
        ) : null}
      </h1>
    </div>
  );
}

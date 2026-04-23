import { cn } from '@/lib/utils';

export interface EditorialArticleTitleProps {
  /** First line — `title1`, bold (700). Usually a short phrase (a few words). */
  primary: string;
  /** Second line — same `title1` scale, medium (500). Optional; keep brief when used. */
  secondary?: string;
  className?: string;
}

/**
 * Editorial article hero title: one or two sentences in the `title1` scale; primary bold, optional secondary medium.
 */
export function EditorialArticleTitle({
  primary,
  secondary,
  className,
}: EditorialArticleTitleProps) {
  const sub = secondary?.trim() ?? '';

  return (
    <div className={cn('w-full max-w-[361px]', className)}>
      <h1 className="flex flex-col gap-2 text-[#313131]">
        <span className="title1 block">{primary.trim()}</span>
        {sub ? <span className="title1 block font-medium">{sub}</span> : null}
      </h1>
    </div>
  );
}

import Image from 'next/image';

import { cn } from '@/lib/utils';
import {
  guideKindLabel,
  type GuideKind,
} from '@/components/city-guides/featured-editorial-hero-card';

export interface CityGuideArticleMetaRowProps {
  guideKind: GuideKind;
  contributors: string[];
  /** Defaults to `words by`. */
  creditLabel?: string;
  className?: string;
}

/**
 * Title-adjacent row: guide kind pill (same as guides home) · “words by” + contributors (user icon + name, no border).
 */
export function CityGuideArticleMetaRow({
  guideKind,
  contributors,
  creditLabel = 'words by',
  className,
}: CityGuideArticleMetaRowProps) {
  return (
    <div
      className={cn(
        'flex w-full max-w-[361px] min-h-[36px] items-center justify-between gap-3',
        className
      )}
    >
      <div
        className="flex h-5 w-fit min-w-0 shrink-0 items-center gap-1 py-0.5 pl-1 pr-2.5"
        style={{
          border: '1px solid var(--Borders-Heavy-Border, #454545)',
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-3 shrink-0 text-[#171717]"
          aria-hidden
        >
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          <circle cx="12" cy="9" r="2.25" fill="white" />
        </svg>
        <span className="min-w-0 whitespace-nowrap label-small uppercase leading-none tracking-wide text-[#171717]">
          {guideKindLabel(guideKind)}
        </span>
      </div>

      {contributors.length > 0 ? (
        <div className="flex min-w-0 flex-col items-end gap-0.5">
          <span className="label-small leading-none text-[#757575]">
            {creditLabel}
          </span>
          <ul className="flex list-none flex-row flex-wrap justify-end gap-2">
            {contributors.map((name, index) => (
              <li
                key={`${name}-${index}`}
                className="flex h-5 w-fit min-w-0 max-w-full shrink-0 items-center gap-1"
              >
                <Image
                  src="/city-guides/user-icon.svg"
                  alt=""
                  width={12}
                  height={12}
                  className="size-3 shrink-0"
                />
                <span className="min-w-0 label-small leading-none text-[#171717]">
                  {name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

import { cn } from '@/lib/utils';
import {
  ArticleContributorCreditItem,
  type ArticleContributorCredit,
} from '@/components/city-guides/article-contributor-credit';

export interface EditorialArticleMetaRowProps {
  contributors: readonly ArticleContributorCredit[];
  /** Defaults to `words by`. */
  creditLabel?: string;
  className?: string;
}

/**
 * Same row as {@link CityGuideArticleMetaRow}, but the kind pill shows a book icon and “Editorial”.
 */
export function EditorialArticleMetaRow({
  contributors,
  creditLabel = 'words by',
  className,
}: EditorialArticleMetaRowProps) {
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
          <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 4h2v5l-1-.75L9 9V4zm9 16H6v-2h12v2z" />
        </svg>
        <span className="min-w-0 whitespace-nowrap label-small uppercase leading-none tracking-wide text-[#171717]">
          Editorial
        </span>
      </div>

      {contributors.length > 0 ? (
        <div className="ml-auto flex min-w-0 shrink-0 flex-col items-end gap-0.5 text-right">
          <span className="label-small leading-none text-[#757575]">
            {creditLabel}
          </span>
          <ul className="flex list-none flex-row flex-wrap justify-end gap-2">
            {contributors.map((contributor, index) => (
              <ArticleContributorCreditItem
                key={
                  typeof contributor === 'string'
                    ? `${contributor}-${index}`
                    : `${contributor.name}-${index}`
                }
                contributor={contributor}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

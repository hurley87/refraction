import Image from 'next/image';

import { cn } from '@/lib/utils';

export interface GuideArticleContributor {
  name: string;
  bio: string;
  photoSrc: string;
  photoAlt: string;
  instagramHref: string;
}

export interface GuideArticleContributorsSectionProps {
  contributors: readonly GuideArticleContributor[];
  className?: string;
}

/**
 * Author card stack: optional “Contributor(s)” title (only when more than one), bordered rows with photo, bio, Instagram.
 */
export function GuideArticleContributorsSection({
  contributors,
  className,
}: GuideArticleContributorsSectionProps) {
  if (contributors.length === 0) return null;

  return (
    <section
      className={cn(
        '-mx-4 box-border flex w-[calc(100%+2rem)] max-w-[393px] shrink-0 flex-col items-center justify-center gap-2 px-4 py-2',
        className
      )}
      aria-label="Contributors"
    >
      {contributors.length > 1 ? (
        <h2 className="title3 flex h-12 w-full shrink-0 items-center text-[#171717]">
          Contributor(s)
        </h2>
      ) : null}
      {contributors.map((contributor) => (
        <div
          key={contributor.name}
          className="flex w-full shrink-0 flex-col items-start gap-2 self-stretch border-t border-[#454545] pb-4 pt-6"
        >
          <div className="flex w-full flex-row items-start gap-3">
            <div className="relative h-24 w-[66px] shrink-0 overflow-hidden">
              <Image
                src={contributor.photoSrc}
                alt={contributor.photoAlt}
                fill
                className="object-cover"
                sizes="66px"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="title4 flex h-[23px] shrink-0 flex-[1_0_0] flex-col justify-center text-[#171717]">
                {contributor.name}
              </div>
              <p className="body-small text-[#757575]">{contributor.bio}</p>
            </div>
            <div className="flex shrink-0 items-center justify-center gap-4 p-1">
              <a
                href={contributor.instagramHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#171717] transition-opacity hover:opacity-70"
                aria-label={`${contributor.name} on Instagram`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={24}
                  height={24}
                  viewBox="0 0 48 48"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M24 4.32187C30.4125 4.32187 31.1719 4.35 33.6281 4.4625C36.0844 4.575 37.1625 4.90312 37.8844 5.1375C38.8219 5.4375 39.5063 5.79687 40.2281 6.51562C40.9594 7.24375 41.3125 7.91875 41.6125 8.85625C41.8469 9.57812 42.175 10.6562 42.2875 13.1125C42.4 15.5688 42.4281 16.3281 42.4281 22.7406C42.4281 29.1531 42.4 29.9125 42.2875 32.3688C42.175 34.825 41.8469 35.9031 41.6125 36.625C41.3125 37.5625 40.9531 38.2469 40.2344 38.9688C39.5063 39.7 38.8313 40.0531 37.8938 40.3531C37.1719 40.5875 36.0938 40.9156 33.6375 41.0281C31.1813 41.1406 30.4219 41.1688 24.0094 41.1688C17.5969 41.1688 16.8375 41.1406 14.3813 41.0281C11.925 40.9156 10.8469 40.5875 10.125 40.3531C9.1875 40.0531 8.50312 39.6937 7.78125 38.975C7.05 38.2469 6.69687 37.5719 6.39687 36.6344C6.1625 35.9125 5.83437 34.8344 5.72187 32.3781C5.60937 29.9219 5.58125 29.1625 5.58125 22.75C5.58125 16.3375 5.60937 15.5781 5.72187 13.1219C5.83437 10.6656 6.1625 9.5875 6.39687 8.86562C6.69687 7.92812 7.05625 7.24375 7.775 6.52187C8.50312 5.79062 9.17812 5.4375 10.1156 5.1375C10.8375 4.90312 11.9156 4.575 14.3719 4.4625C16.8281 4.35 17.5875 4.32187 24 4.32187ZM24 12.2031C17.3438 12.2031 12.2031 17.3438 12.2031 24C12.2031 30.6562 17.3438 35.7969 24 35.7969C30.6562 35.7969 35.7969 30.6562 35.7969 24C35.7969 17.3438 30.6562 12.2031 24 12.2031ZM24 31.3125C19.8187 31.3125 16.4875 27.9813 16.4875 24C16.4875 20.0187 19.8187 16.6875 24 16.6875C28.1813 16.6875 31.5125 20.0187 31.5125 24C31.5125 27.9813 28.1813 31.3125 24 31.3125ZM37.8844 11.6531C37.8844 10.1625 36.6781 8.95625 35.1875 8.95625C33.6969 8.95625 32.4906 10.1625 32.4906 11.6531C32.4906 13.1438 33.6969 14.35 35.1875 14.35C36.6781 14.35 37.8844 13.1438 37.8844 11.6531Z"
                    fill="currentColor"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CityGuidesHubCardImage } from '@/components/city-guides/city-guides-hub-card-image';
import {
  defaultReadLabel,
  guideKindLabel,
  type GuideKind,
} from '@/components/city-guides/featured-editorial-hero-card';

export interface CityGuideListCardProps {
  guideKind: GuideKind;
  title: string;
  preview: string;
  publishedAt: string | Date;
  imageSrc: string;
  imageAlt: string;
  readHref: string;
  className?: string;
}

function formatPublishedDate(publishedAt: string | Date): string {
  const d =
    typeof publishedAt === 'string' ? new Date(publishedAt) : publishedAt;
  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ] as const;
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * CMS-style city guide / editorial row card (361px wide, mobile-first).
 */
export default function CityGuideListCard({
  guideKind,
  title,
  preview,
  publishedAt,
  imageSrc,
  imageAlt,
  readHref,
  className,
}: CityGuideListCardProps) {
  const readLabel = defaultReadLabel(guideKind);

  return (
    <article
      className={cn(
        'mx-auto flex w-full max-w-[361px] flex-col gap-4 border-t border-[var(--Borders-Light-Border,#DBDBDB)] bg-[var(--Backgrounds-Background,#FFFFFF)] pb-6',
        className
      )}
    >
      <CityGuidesHubCardImage
        src={imageSrc}
        alt={imageAlt}
        href={readHref}
        linkLabel={title}
      />

      <div className="flex w-full items-center justify-between gap-2">
        <div
          className="flex h-5 w-fit min-w-0 shrink items-center gap-1 py-0.5 pl-1 pr-2.5"
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
        <div className="flex min-w-0 shrink-0 items-center gap-1.5 text-[#757575]">
          <Calendar className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          <time
            dateTime={
              typeof publishedAt === 'string'
                ? publishedAt
                : publishedAt.toISOString()
            }
            className="label-small whitespace-nowrap uppercase leading-none"
          >
            {formatPublishedDate(publishedAt)}
          </time>
        </div>
      </div>

      <h2 className="title1 min-h-8 text-[#171717]">{title}</h2>

      <p className="body-small line-clamp-2 min-h-10 text-[#757575]">
        {preview}
      </p>

      <Link
        href={readHref}
        className="flex h-8 w-full flex-[1_0_0] items-center justify-between bg-[#DBDBDB] px-2 py-1 transition-colors hover:bg-[#cfcfcf]"
      >
        <span className="label-large uppercase text-[#171717]">
          {readLabel}
        </span>
        <svg
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="size-6 shrink-0"
          aria-hidden
        >
          <path
            d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
            fill="#171717"
          />
        </svg>
      </Link>
    </article>
  );
}

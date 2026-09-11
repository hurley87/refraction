import Image from 'next/image';
import Link from 'next/link';

import type { GuideArticleContributor } from '@/components/city-guides/guide-article-contributors-section';

export type ArticleContributorCredit = string | GuideArticleContributor;

function contributorCreditDetails(contributor: ArticleContributorCredit) {
  if (typeof contributor === 'string') {
    return {
      name: contributor,
      photoSrc: '/city-guides/user-icon.svg',
      profileHref: '',
    };
  }

  return contributor;
}

export function ArticleContributorCreditItem({
  contributor,
}: {
  contributor: ArticleContributorCredit;
}) {
  const { name, photoSrc, profileHref } = contributorCreditDetails(contributor);
  const content = (
    <>
      <Image
        src={photoSrc}
        alt=""
        width={16}
        height={16}
        className="size-4 shrink-0 rounded-full object-cover"
      />
      <span className="min-w-0 label-small leading-none text-[#171717]">
        {name}
      </span>
    </>
  );

  return (
    <li className="flex h-5 w-fit min-w-0 max-w-full shrink-0 items-center">
      {profileHref ? (
        <Link
          href={profileHref}
          className="flex min-w-0 items-center gap-1 transition-opacity hover:opacity-70"
          aria-label={`View ${name}'s profile`}
        >
          {content}
        </Link>
      ) : (
        <span className="flex min-w-0 items-center gap-1">{content}</span>
      )}
    </li>
  );
}
